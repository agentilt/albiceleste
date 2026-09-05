"""football-data.org v4 (free tier: 10 req/min, TIER_ONE competitions, non-commercial, attribution).

Free tier gives fixtures/results/standings/scorers and squads with nationality; no lineups.
"""
from __future__ import annotations

from datetime import date

from ..log import log
from .base import Context, RawRecord

BASE = "https://api.football-data.org/v4"
SOURCE = "fd"
MIN_INTERVAL = 6.2  # 10/min with headroom


def _get(ctx: Context, path: str, params: dict | None = None):
    if not ctx.settings.football_data_api_key:
        raise RuntimeError("FOOTBALL_DATA_API_KEY is not set")
    url = f"{BASE}{path}"
    status, _, body = ctx.http.get(SOURCE, url, params=params, headers={"X-Auth-Token": ctx.settings.football_data_api_key}, min_interval=MIN_INTERVAL)
    if status != 200 or not isinstance(body, dict):
        log.warning("fd %s %s → HTTP %s %s", path, params, status, str(body)[:200])
        return None, url
    return body, url


def ingest_competitions(ctx: Context) -> int:
    body, url = _get(ctx, "/competitions")
    if not body:
        return 0
    records = [RawRecord(SOURCE, "competition", c["code"] or str(c["id"]), c, url) for c in body["competitions"]]
    n = ctx.save(records)
    log.info("fd competitions: %d", len(records))
    return n


def ingest_teams(ctx: Context, codes: list[str]) -> int:
    total = 0
    for code in codes:
        body, url = _get(ctx, f"/competitions/{code}/teams")
        if not body:
            continue
        records = []
        for t in body.get("teams", []):
            t["_competition"] = code
            t["_season"] = body.get("season")
            records.append(RawRecord(SOURCE, "team", f"{code}:{t['id']}", t, url))
        total += ctx.save(records)
        with_squad = sum(1 for t in body.get("teams", []) if t.get("squad"))
        log.info("fd teams %s: %d teams, %d with squads in list response", code, len(records), with_squad)
        # If the list omits squads, fetch team details (one call per team).
        if with_squad == 0:
            for t in body.get("teams", []):
                detail, durl = _get(ctx, f"/teams/{t['id']}")
                if detail:
                    detail["_competition"] = code
                    total += ctx.save([RawRecord(SOURCE, "team", f"{code}:{t['id']}", detail, durl)])
    return total


def ingest_matches(ctx: Context, codes: list[str], date_from: date, date_to: date) -> int:
    total = 0
    for code in codes:
        params = {"dateFrom": date_from.isoformat(), "dateTo": date_to.isoformat()}
        body, url = _get(ctx, f"/competitions/{code}/matches", params)
        if not body:
            continue
        records = []
        for m in body.get("matches", []):
            m["_competition"] = code
            records.append(RawRecord(SOURCE, "match", str(m["id"]), m, url, params))
        total += ctx.save(records)
        log.info("fd matches %s %s..%s: %d", code, date_from, date_to, len(records))
    return total


def ingest_standings(ctx: Context, codes: list[str]) -> int:
    total = 0
    for code in codes:
        body, url = _get(ctx, f"/competitions/{code}/standings")
        if not body:
            continue
        season = (body.get("season") or {}).get("startDate", "")[:4]
        total += ctx.save([RawRecord(SOURCE, "standings", f"{code}:{season}", body, url)])
    log.info("fd standings: %d competitions", len(codes))
    return total


def ingest_scorers(ctx: Context, codes: list[str], limit: int = 100) -> int:
    total = 0
    for code in codes:
        body, url = _get(ctx, f"/competitions/{code}/scorers", {"limit": limit})
        if not body:
            continue
        season = (body.get("season") or {}).get("startDate", "")[:4]
        total += ctx.save([RawRecord(SOURCE, "scorers", f"{code}:{season}", body, url, {"limit": limit})])
    log.info("fd scorers: %d competitions", len(codes))
    return total
