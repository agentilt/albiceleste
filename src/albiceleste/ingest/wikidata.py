"""Wikidata: identity, eligibility evidence, external IDs, and career memberships.

Eligible-set definition used for the pull (deliberately broad; dbt narrows to senior eligibility):
  association football player AND (Argentine citizenship OR member of any Argentina national team)
Queries are chunked by birth year so each stays well under the 60 s endpoint limit.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import date

from ..log import log
from .base import Context, RawRecord

SPARQL_URL = "https://query.wikidata.org/sparql"
SOURCE = "wikidata"

ELIGIBLE_PATTERN = """
  ?p wdt:P106 wd:Q937857 ; wdt:P569 ?dob .
  FILTER(YEAR(?dob) = %(year)d)
  { ?p wdt:P27 wd:Q414 . }
  UNION
  { ?p wdt:P54 ?nt . ?nt wdt:P17 wd:Q414 ; wdt:P31/wdt:P279* wd:Q6979593 . }
"""

PLAYERS_QUERY = """
SELECT ?p ?pLabel ?dob ?pobLabel ?genderLabel
       (GROUP_CONCAT(DISTINCT ?citLabel; separator="|") AS ?citizenships)
       (GROUP_CONCAT(DISTINCT ?posLabel; separator="|") AS ?positions)
       (SAMPLE(?tm) AS ?transfermarkt_id) (SAMPLE(?fb) AS ?fbref_id)
       (SAMPLE(?sw) AS ?soccerway_id) (SAMPLE(?es) AS ?espn_id)
       (SAMPLE(?height) AS ?height_cm)
WHERE {
  %(eligible)s
  OPTIONAL { ?p wdt:P27 ?cit . ?cit rdfs:label ?citLabel FILTER(LANG(?citLabel) = "en") }
  OPTIONAL { ?p wdt:P413 ?pos . ?pos rdfs:label ?posLabel FILTER(LANG(?posLabel) = "en") }
  OPTIONAL { ?p wdt:P2446 ?tm }
  OPTIONAL { ?p wdt:P5750 ?fb }
  OPTIONAL { ?p wdt:P2369 ?sw }
  OPTIONAL { ?p wdt:P3681 ?es }
  OPTIONAL { ?p wdt:P19 ?pob }
  OPTIONAL { ?p wdt:P21 ?gender }
  OPTIONAL { ?p wdt:P2048 ?height }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
GROUP BY ?p ?pLabel ?dob ?pobLabel ?genderLabel
"""

MEMBERSHIPS_QUERY = """
SELECT ?p ?team ?teamLabel ?start ?end ?matches ?goals ?teamCountryLabel
       (GROUP_CONCAT(DISTINCT ?ttLabel; separator="|") AS ?team_types)
WHERE {
  %(eligible)s
  ?p p:P54 ?ms . ?ms ps:P54 ?team .
  OPTIONAL { ?ms pq:P580 ?start }
  OPTIONAL { ?ms pq:P582 ?end }
  OPTIONAL { ?ms pq:P1350 ?matches }
  OPTIONAL { ?ms pq:P1351 ?goals }
  OPTIONAL { ?team wdt:P17 ?teamCountry }
  OPTIONAL { ?team wdt:P31 ?tt . ?tt rdfs:label ?ttLabel FILTER(LANG(?ttLabel) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". }
}
GROUP BY ?p ?team ?teamLabel ?start ?end ?matches ?goals ?teamCountryLabel
"""


def _qid(uri: str) -> str:
    return uri.rsplit("/", 1)[-1]


def _query(ctx: Context, sparql: str) -> list[dict]:
    status, _, body = ctx.http.get(
        SOURCE,
        SPARQL_URL,
        params={"query": sparql},
        headers={"Accept": "application/sparql-results+json"},
        min_interval=12.0,  # the endpoint budgets ~60 s of query time per minute per client
        retries=5,
    )
    if status != 200 or not isinstance(body, dict):
        raise RuntimeError(f"wikidata query failed: HTTP {status}: {str(body)[:300]}")
    return [{k: v["value"] for k, v in row.items()} for row in body["results"]["bindings"]]


def _years(ctx: Context, year_from: int | None, year_to: int | None) -> range:
    start = year_from or ctx.settings.dob_floor.year
    end = year_to or (date.today().year - 14)
    return range(start, end + 1)


def ingest_players(ctx: Context, year_from: int | None = None, year_to: int | None = None) -> int:
    total = 0
    for year in _years(ctx, year_from, year_to):
        try:
            rows = _query(ctx, PLAYERS_QUERY % {"eligible": ELIGIBLE_PATTERN % {"year": year}})
        except RuntimeError as exc:
            log.error("wikidata players born %d skipped: %s", year, exc)
            continue
        records = []
        for r in rows:
            qid = _qid(r["p"])
            payload = {
                "qid": qid,
                "name": r.get("pLabel"),
                "dob": r.get("dob"),
                "place_of_birth": r.get("pobLabel"),
                "gender": r.get("genderLabel"),
                "citizenships": [c for c in (r.get("citizenships") or "").split("|") if c],
                "positions": [c for c in (r.get("positions") or "").split("|") if c],
                "transfermarkt_id": r.get("transfermarkt_id"),
                "fbref_id": r.get("fbref_id"),
                "soccerway_id": r.get("soccerway_id"),
                "espn_id": r.get("espn_id"),
                "height_cm": r.get("height_cm"),
            }
            records.append(RawRecord(SOURCE, "player", qid, payload, SPARQL_URL, {"birth_year": year}))
        n = ctx.save(records)
        total += n
        log.info("wikidata players born %d: %d rows, %d new versions", year, len(rows), n)
    return total


def ingest_memberships(ctx: Context, year_from: int | None = None, year_to: int | None = None) -> int:
    total = 0
    for year in _years(ctx, year_from, year_to):
        try:
            rows = _query(ctx, MEMBERSHIPS_QUERY % {"eligible": ELIGIBLE_PATTERN % {"year": year}})
        except RuntimeError as exc:
            log.error("wikidata memberships born %d skipped: %s", year, exc)
            continue
        by_player: dict[str, list[dict]] = defaultdict(list)
        for r in rows:
            by_player[_qid(r["p"])].append(
                {
                    "team_qid": _qid(r["team"]),
                    "team": r.get("teamLabel"),
                    "team_country": r.get("teamCountryLabel"),
                    "team_types": [t for t in (r.get("team_types") or "").split("|") if t],
                    "start": r.get("start"),
                    "end": r.get("end"),
                    "matches": r.get("matches"),
                    "goals": r.get("goals"),
                }
            )
        records = [
            RawRecord(SOURCE, "player_memberships", qid, {"qid": qid, "memberships": ms}, SPARQL_URL, {"birth_year": year})
            for qid, ms in by_player.items()
        ]
        n = ctx.save(records)
        total += n
        log.info("wikidata memberships born %d: %d players, %d new versions", year, len(by_player), n)
    return total
