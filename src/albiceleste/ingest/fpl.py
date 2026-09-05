"""Fantasy Premier League public API — EPL ground truth for minutes/starts/xG per gameweek."""
from __future__ import annotations

import unicodedata
from collections import Counter

from ..log import log
from .base import Context, RawRecord

BASE = "https://fantasy.premierleague.com/api"
SOURCE = "fpl"
HEADERS = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/128.0 Safari/537.36"}


def _norm(s: str | None) -> str:
    s = unicodedata.normalize("NFKD", s or "")
    return "".join(c for c in s if not unicodedata.combining(c)).lower().strip()


def _get(ctx: Context, path: str):
    url = f"{BASE}{path}"
    status, _, body = ctx.http.get(SOURCE, url, headers=HEADERS, min_interval=0.4)
    if status != 200 or not isinstance(body, dict):
        log.warning("fpl %s → HTTP %s", path, status)
        return None, url
    return body, url


def ingest_bootstrap(ctx: Context) -> int:
    body, url = _get(ctx, "/bootstrap-static/")
    if not body:
        return 0
    records = [RawRecord(SOURCE, "element", str(e["id"]), e, url) for e in body["elements"]]
    records += [RawRecord(SOURCE, "team", str(t["id"]), t, url) for t in body["teams"]]
    records += [RawRecord(SOURCE, "event", str(e["id"]), e, url) for e in body["events"]]
    n = ctx.save(records)
    log.info("fpl bootstrap: %d elements, %d teams, %d events", len(body["elements"]), len(body["teams"]), len(body["events"]))
    return n


def detect_argentina_region(ctx: Context) -> int | None:
    """FPL exposes nationality only as an opaque `region` code. Infer Argentina's code from players
    ESPN lists as Argentine in the Premier League."""
    espn_names = {
        _norm(r["name"])
        for r in ctx.query(
            """
            SELECT a->>'displayName' AS name
              FROM raw.latest, jsonb_array_elements(payload->'athletes') a
             WHERE source='espn' AND entity='roster' AND payload->>'_league'='eng.1'
               AND a->>'citizenship'='Argentina'
            """
        )
    }
    if not espn_names:
        return None
    elements = ctx.query(
        "SELECT payload->>'first_name' AS fn, payload->>'second_name' AS sn, payload->>'web_name' AS wn, "
        "(payload->>'region')::int AS region FROM raw.latest WHERE source='fpl' AND entity='element'"
    )
    votes: Counter[int] = Counter()
    for e in elements:
        full = _norm(f"{e['fn']} {e['sn']}")
        if e["region"] is not None and (full in espn_names or any(_norm(e["sn"]) and _norm(e["sn"]) in n for n in espn_names) and full.split()[-1] in {n.split()[-1] for n in espn_names}):
            votes[e["region"]] += 1
    if not votes:
        return None
    region, n = votes.most_common(1)[0]
    log.info("fpl: Argentina region inferred as %s from %d name matches", region, n)
    return region


def ingest_history(ctx: Context, region: int | None = None) -> int:
    region = region or detect_argentina_region(ctx)
    if region is None:
        log.warning("fpl: could not determine Argentina region code; pass --region")
        return 0
    elements = ctx.query(
        "SELECT source_record_id AS id, payload->>'web_name' AS name FROM raw.latest "
        "WHERE source='fpl' AND entity='element' AND (payload->>'region')::int = %s",
        (region,),
    )
    total = 0
    for e in elements:
        body, url = _get(ctx, f"/element-summary/{e['id']}/")
        if not body:
            continue
        body["_element_id"] = int(e["id"])
        body["_region"] = region
        total += ctx.save([RawRecord(SOURCE, "element_summary", e["id"], body, url)])
    log.info("fpl history: %d players in region %s", len(elements), region)
    return total
