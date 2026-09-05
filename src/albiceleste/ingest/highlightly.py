"""Highlightly football API (free plan: 100 requests/day).

Quota discipline: every call reads x-ratelimit-requests-remaining and we stop before the reserve.
Match lists are only requested for league-days where ESPN already shows completed matches, so the
quota goes to box scores. Payloads get `_espn_league` and `_query_date` injected.
"""
from __future__ import annotations

from datetime import date

from ..config import HIGHLIGHTLY_COUNTRY_CODES
from ..log import log
from .base import Context, RawRecord

BASE = "https://soccer.highlightly.net"
SOURCE = "highlightly"
RL_HEADER = "x-ratelimit-requests-remaining"


class QuotaExhausted(RuntimeError):
    pass


def _headers(ctx: Context) -> dict[str, str]:
    if not ctx.settings.highlightly_api_key:
        raise RuntimeError("HIGHLIGHTLY_API_KEY is not set")
    return {"x-rapidapi-key": ctx.settings.highlightly_api_key, "x-rapidapi-host": "soccer.highlightly.net"}


def remaining_today(ctx: Context) -> int | None:
    row = ctx.query(
        "SELECT ratelimit_remaining FROM meta.api_calls WHERE source=%s AND ratelimit_remaining IS NOT NULL "
        "ORDER BY called_at DESC LIMIT 1",
        (SOURCE,),
    )
    return row[0]["ratelimit_remaining"] if row else None


def _guard(ctx: Context) -> None:
    rem = remaining_today(ctx)
    if rem is not None and rem <= ctx.settings.highlightly_daily_reserve:
        raise QuotaExhausted(f"highlightly remaining={rem} <= reserve={ctx.settings.highlightly_daily_reserve}")


def _get(ctx: Context, path: str, params: dict | None = None):
    _guard(ctx)
    url = f"{BASE}{path}"
    status, hdrs, body = ctx.http.get(SOURCE, url, params=params, headers=_headers(ctx), min_interval=0.5, ratelimit_header=RL_HEADER)
    if status != 200:
        log.warning("highlightly %s %s → HTTP %s %s", path, params, status, str(body)[:200])
        return None, url
    data = body.get("data", body) if isinstance(body, dict) else body
    return data, url


def ingest_leagues(ctx: Context, espn_codes: list[str]) -> int:
    total = 0
    for code in espn_codes:
        cc = HIGHLIGHTLY_COUNTRY_CODES.get(code)
        if not cc:
            continue
        data, url = _get(ctx, "/leagues", {"countryCode": cc, "limit": 100})
        if not data:
            continue
        records = []
        for lg in data:
            lg["_country_code"] = cc
            records.append(RawRecord(SOURCE, "league", str(lg["id"]), lg, url, {"countryCode": cc}))
        total += ctx.save(records)
        log.info("highlightly leagues %s: %s", cc, [(lg["id"], lg["name"]) for lg in data[:6]])
    return total


def plan_match_days(ctx: Context, date_from: date, date_to: date) -> list[tuple[str, date]]:
    """League-days with completed ESPN events that have no Highlightly match list yet."""
    ids = ctx.settings.highlightly_league_ids
    rows = ctx.query(
        """
        WITH espn_days AS (
          SELECT DISTINCT payload->>'_league' AS league, (payload->>'date')::timestamptz::date AS d
            FROM raw.latest
           WHERE source='espn' AND entity='event'
             AND (payload->'status'->'type'->>'completed')::boolean
             AND payload->>'_league' = ANY(%s)
             AND (payload->>'date')::timestamptz::date BETWEEN %s AND %s
        ), have AS (
          SELECT DISTINCT payload->>'_espn_league' AS league,
                 coalesce((payload->>'_query_date')::date, (payload->>'date')::timestamptz::date) AS d
            FROM raw.latest WHERE source='highlightly' AND entity='match'
        )
        SELECT e.league, e.d FROM espn_days e
        LEFT JOIN have h ON h.league = e.league AND h.d = e.d
        WHERE h.league IS NULL
        ORDER BY e.d DESC, e.league
        """,
        (list(ids.keys()), date_from, date_to),
    )
    return [(r["league"], r["d"]) for r in rows]


def ingest_matches(ctx: Context, league_days: list[tuple[str, date]], max_requests: int | None = None) -> int:
    total = 0
    for i, (league, d) in enumerate(league_days):
        if max_requests is not None and i >= max_requests:
            break
        lid = ctx.settings.highlightly_league_ids[league]
        params = {"leagueId": lid, "date": d.isoformat(), "limit": 100}
        try:
            data, url = _get(ctx, "/matches", params)
        except QuotaExhausted as exc:
            log.warning(str(exc))
            break
        if data is None:
            continue
        records = []
        for m in data:
            m["_espn_league"] = league
            m["_query_date"] = d.isoformat()
            records.append(RawRecord(SOURCE, "match", str(m["id"]), m, url, params))
        if not data:
            # Remember the empty day so we do not ask again (e.g. FIFA window vs ESPN cup game).
            records.append(RawRecord(SOURCE, "match", f"empty:{league}:{d.isoformat()}",
                                     {"id": None, "_empty": True, "_espn_league": league, "_query_date": d.isoformat()}, url, params))
        total += ctx.save(records)
        log.info("highlightly matches %s %s: %d", league, d, len(data))
    return total


def ingest_season_matches(ctx: Context, leagues: list[str], season: int, page_size: int = 100, max_pages: int = 12) -> int:
    """Whole-season match list per league via limit/offset paging (about 4-6 requests per league).
    Stores fixtures as well as results, so future matches are known too."""
    total = 0
    for league in leagues:
        lid = ctx.settings.highlightly_league_ids.get(league)
        if not lid:
            continue
        n = 0
        for page in range(max_pages):
            params = {"leagueId": lid, "season": season, "limit": page_size, "offset": page * page_size}
            try:
                data, url = _get(ctx, "/matches", params)
            except QuotaExhausted as exc:
                log.warning(str(exc))
                return total
            if data is None:
                break
            records = []
            for m in data:
                m["_espn_league"] = league
                m["_season"] = season
                records.append(RawRecord(SOURCE, "match", str(m["id"]), m, url, params))
            total += ctx.save(records)
            n += len(data)
            if len(data) < page_size:
                break
        log.info("highlightly season %d matches %s: %d (remaining today %s)", season, league, n, remaining_today(ctx))
    return total


def ingest_boxscores(ctx: Context, limit: int = 60) -> int:
    pending = ctx.query(
        """
        SELECT m.source_record_id AS match_id, m.payload->>'_espn_league' AS league, m.payload->>'date' AS date
          FROM raw.latest m
         WHERE m.source='highlightly' AND m.entity='match'
           AND (m.payload->>'_empty') IS NULL
           AND lower(coalesce(m.payload->'state'->>'description','')) LIKE 'finish%%'
           AND NOT EXISTS (SELECT 1 FROM raw.latest b WHERE b.source='highlightly' AND b.entity='boxscore'
                             AND b.source_record_id = m.source_record_id)
         ORDER BY m.payload->>'date' DESC
         LIMIT %s
        """,
        (limit,),
    )
    total = 0
    for i, m in enumerate(pending, 1):
        try:
            data, url = _get(ctx, f"/box-score/{m['match_id']}")
        except QuotaExhausted as exc:
            log.warning(str(exc))
            break
        if data is None:
            continue
        payload = {"matchId": int(m["match_id"]), "_espn_league": m["league"], "teams": data if isinstance(data, list) else [data]}
        total += ctx.save([RawRecord(SOURCE, "boxscore", m["match_id"], payload, url)])
        if i % 10 == 0:
            log.info("highlightly boxscores: %d/%d (remaining today %s)", i, len(pending), remaining_today(ctx))
    log.info("highlightly boxscores: fetched %d of %d pending; remaining today %s", total, len(pending), remaining_today(ctx))
    return total
