"""ESPN undocumented site API (host site.web.api.espn.com — the other host blocks non-browsers).

Entities: team, roster, event, summary. Each payload gets an injected `_league` key.
Summaries are trimmed to the parts we use (header, rosters, keyEvents, boxscore, gameInfo).
"""
from __future__ import annotations

from datetime import date, timedelta

from ..log import log
from .base import Context, RawRecord

BASE = "https://site.web.api.espn.com/apis/site/v2/sports/soccer"
SOURCE = "espn"
MIN_INTERVAL = 0.35
UA_HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
}
SUMMARY_KEEP = ("header", "rosters", "keyEvents", "boxscore", "gameInfo")


def _get(ctx: Context, url: str, params: dict | None = None):
    status, _, body = ctx.http.get(SOURCE, url, params=params, headers=UA_HEADERS, min_interval=MIN_INTERVAL)
    if status != 200 or not isinstance(body, dict):
        log.warning("espn %s → HTTP %s", url, status)
        return None
    return body


def ingest_teams(ctx: Context, leagues: list[str]) -> int:
    total = 0
    for league in leagues:
        url = f"{BASE}/{league}/teams"
        body = _get(ctx, url)
        if not body:
            continue
        teams = [t["team"] for t in body["sports"][0]["leagues"][0]["teams"]]
        records = []
        for t in teams:
            t["_league"] = league
            records.append(RawRecord(SOURCE, "team", f"{league}:{t['id']}", t, url))
        total += ctx.save(records)
        log.info("espn teams %s: %d", league, len(teams))
    return total


def ingest_rosters(ctx: Context, leagues: list[str]) -> int:
    total = 0
    for league in leagues:
        teams = ctx.query(
            "SELECT payload->>'id' AS id, payload->>'displayName' AS name FROM raw.latest "
            "WHERE source='espn' AND entity='team' AND payload->>'_league' = %s ORDER BY 1",
            (league,),
        )
        if not teams:
            log.warning("no espn teams stored for %s — run `alb ingest espn teams` first", league)
            continue
        n_players = 0
        for t in teams:
            url = f"{BASE}/{league}/teams/{t['id']}/roster"
            body = _get(ctx, url)
            if not body:
                continue
            body["_league"] = league
            body["_team_id"] = t["id"]
            n_players += len(body.get("athletes", []))
            total += ctx.save([RawRecord(SOURCE, "roster", f"{league}:{t['id']}", body, url)])
        log.info("espn rosters %s: %d teams, %d athletes", league, len(teams), n_players)
    return total


def _chunks(d0: date, d1: date, days: int = 7):
    cur = d0
    while cur <= d1:
        end = min(cur + timedelta(days=days - 1), d1)
        yield cur, end
        cur = end + timedelta(days=1)


def ingest_scoreboard(ctx: Context, leagues: list[str], date_from: date, date_to: date) -> int:
    total = 0
    for league in leagues:
        n_events = 0
        for d0, d1 in _chunks(date_from, date_to):
            url = f"{BASE}/{league}/scoreboard"
            params = {"dates": f"{d0:%Y%m%d}-{d1:%Y%m%d}", "limit": 300}
            body = _get(ctx, url, params)
            if not body:
                continue
            records = []
            for ev in body.get("events", []):
                ev["_league"] = league
                records.append(RawRecord(SOURCE, "event", ev["id"], ev, url, params))
            n_events += len(records)
            total += ctx.save(records)
        log.info("espn scoreboard %s %s..%s: %d events", league, date_from, date_to, n_events)
    return total


def ingest_summaries(ctx: Context, leagues: list[str], limit: int = 500) -> int:
    """Fetch summaries for completed events that do not have one yet."""
    pending = ctx.query(
        """
        SELECT e.source_record_id AS event_id, e.payload->>'_league' AS league, e.payload->>'date' AS date
          FROM raw.latest e
         WHERE e.source='espn' AND e.entity='event'
           AND e.payload->>'_league' = ANY(%s)
           AND (e.payload->'status'->'type'->>'completed')::boolean
           AND NOT EXISTS (SELECT 1 FROM raw.latest s WHERE s.source='espn' AND s.entity='summary'
                             AND s.source_record_id = e.source_record_id)
         ORDER BY e.payload->>'date' DESC
         LIMIT %s
        """,
        (leagues, limit),
    )
    total = 0
    for i, ev in enumerate(pending, 1):
        url = f"{BASE}/{ev['league']}/summary"
        body = _get(ctx, url, {"event": ev["event_id"]})
        if not body:
            continue
        trimmed = {k: body[k] for k in SUMMARY_KEEP if k in body}
        trimmed["_league"] = ev["league"]
        trimmed["_event_id"] = ev["event_id"]
        total += ctx.save([RawRecord(SOURCE, "summary", ev["event_id"], trimmed, url, {"event": ev["event_id"]})])
        if i % 25 == 0:
            log.info("espn summaries: %d/%d", i, len(pending))
    log.info("espn summaries: fetched %d (pending was %d)", total, len(pending))
    return total
