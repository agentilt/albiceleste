# Phase 1 — Local Data Platform

**Date:** 2026-09-05
**Deliverable:** a reproducible local database: five free sources → versioned raw layer → dbt staging, entity resolution, and analytical marts.

## 1. Architecture

```
                 ┌──────────────┐   alb ingest …    ┌───────────────────────────┐
  Wikidata ─────►│              │──────────────────►│ raw.records (jsonb,       │
  ESPN ─────────►│  albiceleste │  every payload     │  versioned by content     │
  Highlightly ──►│  Python CLI  │  also mirrored to  │  hash; nothing overwritten│
  football-data ►│  (src/)      │  data/raw/*.json   ├───────────────────────────┤
  FPL ──────────►│              │                    │ meta.pipeline_runs        │
                 └──────────────┘                    │ meta.api_calls (quota)    │
                                                     └─────────────┬─────────────┘
                                                                   │ dbt (transform/)
                                          ┌────────────────────────▼──────────────────────────┐
                                          │ staging.*      typed views over raw.latest        │
                                          │ intermediate.* eligibility + entity resolution    │
                                          │ marts.*        dim_player, fct_match,             │
                                          │                fct_player_match_stats, form, …    │
                                          └────────────────────────────────────────────────────┘
```

Everything runs from `docker compose up` (Postgres 16 with `unaccent` and `pg_trgm`) plus `uv sync`.
No cloud dependency. The raw store writes S3-style keys to disk so swapping in S3/MinIO later is a one-class change.

## 2. Raw layer

`raw.records` holds every API response ever fetched:

| column | meaning |
|---|---|
| `source`, `entity`, `source_record_id` | provider, record type, provider's own id |
| `payload` | the JSON as received (plus injected `_league`, `_espn_league`, `_season` helper keys) |
| `content_hash` | sha256 of the canonical JSON; a changed payload is a new row, an identical one is skipped |
| `ingested_at`, `run_id`, `fetched_url`, `params` | provenance |

`raw.latest` is the one-row-per-record view the staging models read. History questions ("what did the squad look like in August?") are answered from `raw.records` directly.

`meta.pipeline_runs` records every CLI run; `meta.api_calls` records every HTTP call with status, duration and the Highlightly `x-ratelimit-requests-remaining` header, which is how the quota guard works.

## 3. Ingestion (`alb` CLI)

| command | what it pulls | notes |
|---|---|---|
| `alb ingest wikidata players` | eligible footballers by birth year: identity, DOB, citizenships, positions, Transfermarkt/FBref/Soccerway/ESPN ids | 12 s pacing; the endpoint budgets query time per client |
| `alb ingest wikidata memberships` | every club and national-team spell with start/end | drives senior-eligibility flags |
| `alb ingest espn teams / rosters` | squads for 7 leagues with citizenship, DOB, position, injuries | ~150 requests |
| `alb ingest espn scoreboard / summaries` | fixtures + results; per-player lineups and stats for completed matches | summaries trimmed to header/rosters/keyEvents/boxscore |
| `alb ingest highlightly season` | whole-season match lists via limit/offset paging | ~5 requests per league |
| `alb ingest highlightly matches` | match lists only for league-days where ESPN shows completed games | daily incremental |
| `alb ingest highlightly boxscores` | per-player minutes, xG, xA, passing, duels, rating | stops at the daily reserve |
| `alb ingest fd competitions / teams / matches / standings / scorers` | licensed fixtures, tables, squads with nationality | 6.2 s pacing (10/min) |
| `alb ingest fpl bootstrap / history` | Premier League per-gameweek minutes/xG for Argentine players | Argentina's opaque `region` code is inferred from ESPN |
| `alb run bootstrap` | first full load since season start | `--skip-wikidata` to run Wikidata as its own process |
| `alb run daily` / `alb run weekly` | incremental schedules | put these in cron/launchd |
| `alb db init` / `alb db status` | schema bootstrap; counts, quota, recent runs | |

Highlightly quota discipline: the daily reserve (default 10) is never spent; box scores are fetched newest-first, so a backlog from season start clears over several days without manual intervention.

## 4. Transformation (dbt)

Run from `transform/`: `uv run dbt seed && uv run dbt run && uv run dbt test`.

**Staging** (`staging.*`, views): one model per raw entity, JSON parsed into typed columns.
ESPN minutes are *derived* from starter/substitution clocks (90 minutes as the reference, no stoppage time); Highlightly minutes are given.

**Intermediate** (`intermediate.*`, tables):

- `int_wikidata_eligibility` — senior eligibility from evidence:
  `eligible` = Argentine citizenship or Argentina senior cap and no senior spell for another nation;
  `review` = a senior spell for another nation exists (Wikidata cannot tell friendlies from competitive caps);
  `youth_only` = only Argentina youth spells and no recorded citizenship.
- `int_player_xref_espn`, `int_player_xref_fd`, `int_player_xref_fpl` — resolve to Wikidata / each other by **identical date of birth plus a compatible name** (similar surname and similar given name or same initial). Year-precision Wikidata DOBs require a near-exact name. Mutual-best ranking keeps it one-to-one.
- `int_player_xref_hl` — Highlightly box-score players have no DOB; they resolve to ESPN roster players of the mapped team by compatible name.
- `int_team_xref`, `int_match_xref` — ESPN ↔ Highlightly ↔ football-data.org teams (trigram similarity within league, mutual best) and matches (same teams, kickoff within 36 h).
- `int_players` — the canonical population: Wikidata-eligible players ∪ ESPN Argentine-citizenship players ∪ football-data Argentine-nationality players, deduplicated through the crosswalks. `player_key` is the Wikidata QID when known, else `espn:<id>` or `fd:<id>`.

**Marts** (`marts.*`, tables):

| model | grain | purpose |
|---|---|---|
| `dim_player` | player | identity, eligibility flags, current club/league/country, injury flag, all source ids |
| `player_source_ids` | player × source | long-format crosswalk |
| `dim_team`, `dim_competition` | team, league | ESPN ids with Highlightly/fd ids; hand-maintained `level_rank` |
| `fct_match` | match (ESPN event) | fixtures/results with Highlightly and fd ids attached |
| `fct_player_match_stats` | player × match | Highlightly primary, ESPN fallback; `stats_source` says which |
| `player_season_stats` | player × league × season | apps, starts, minutes, goals, assists, xG, xA, per-90s |
| `player_recent_form` | player × window (28/56/84 d) | current vs. previous window: minutes share, change %, starts change |
| `argentine_players_abroad` | player | eligible/review players outside Argentina with current-season line |
| `argentine_league_presence` | league | headcount, U23, capped, clubs with Argentines |
| `dq_unmatched` | issue | entity-resolution leftovers for review |

Tests: uniqueness/not-null on every key, accepted values on eligibility and stats source, relationships from facts to dimensions, and minutes within 0–130.

## 5. Design decisions worth remembering

- **Precision over recall in identity.** A wrong merge corrupts two players; an unresolved Argentine still enters the population under an `espn:` key. Loose DOB-only matching produced merges like "Cássio → Damián Casalinuovo" and was replaced by the surname/given-name rule.
- **ESPN feeds identity and coverage, Highlightly feeds quality stats.** ESPN is unlimited and lists citizenship; Highlightly has 100 calls/day and the rich box score. Both are kept; `stats_source` makes the provenance explicit per row.
- **History lives in raw, not in marts.** Marts are rebuilt from `raw.latest`; snapshots of "what was true then" are queries over `raw.records` by `ingested_at`. dbt snapshots of `dim_player` can be added in Phase 2 when change detection needs them.
- **Argentina's league is ingested fully but will be filtered at the product layer.** ~900 Argentine-citizenship players in 30 squads; the Phase 0 "focus set" rule belongs in Phase 2.

## 6. Known limitations

- ESPN minutes ignore stoppage time and treat every match as 90 minutes; Highlightly overrides them wherever a box score exists.
- `has_arg_senior_cap` depends on Wikidata membership statements, which lag for recent debutants.
- Highlightly's `season` for European leagues is the calendar year the season starts; Argentina's is the calendar year. Season labels in `fct_match` come from ESPN.
- No Transfermarkt history yet (the CC0 snapshot is frozen at June 2026; loading it is a Phase 2 task).
- ESPN is an undocumented API. If it changes, `stg_espn__*` break first and loudly.
- Team identities across sources are fuzzy-matched; seven clubs needed hand-pinning in `seeds/team_xref_overrides.csv` (e.g. "Atlético-MG" vs "CA Mineiro"). New leagues will need a few more.
- Highlightly occasionally has two player ids for one person; the crosswalk keeps one per ESPN athlete and the other shows in `dq_unmatched`.
- football-data.org returns 404 for Champions League standings on the free tier; league standings work.

## 7. Bootstrap results (2026-09-05)

First full load, run as two parallel processes (`alb run bootstrap --skip-wikidata` and the two Wikidata commands). About 25 minutes wall-clock, dominated by rate limits.

| raw entity | records |
|---|---|
| wikidata.player / player_memberships | 5,055 / 4,114 |
| espn.team / roster / event / summary | 146 / 146 / 315 / 300 |
| highlightly.match / boxscore | 1,696 (whole 2026 season lists, 7 leagues) / 45 (quota-bound; backlog clears daily) |
| fd.team / match / standings / scorers | 152 / 352 / 6 / 7 (Champions League standings 404 on the free tier) |
| fpl.element / element_summary | 652 / 18 (Argentina region code inferred from ESPN as 10) |

Highlightly quota used: 83 of 100 (13 for verification, ~70 for the load). `dbt run` builds 39 relations; `dbt test` passes 49 tests.

**Population (`dim_player`)**

| measure | count |
|---|---|
| players | 5,207 |
| eligible / review / youth_only | 5,169 / 35 / 3 |
| in a tracked squad today | 1,047 |
| abroad (six foreign leagues) | 122 |
| with an Argentina senior cap on record | 182 |
| resolved to Highlightly / FPL / football-data ids | 404 / 18 / 125 |

Review cases in tracked squads are exactly the expected kind: Gabriel Arias (Chile), Norberto Briasco (Armenia), Alan Soñora (USA).

**Crosswalk quality**

| check | result |
|---|---|
| ESPN Argentine squad players resolved to Wikidata | 100% eng.1, 96% esp.1, 87% ita.1, 77% bra.1, 52% arg.1 (many domestic youth players have no Wikidata item; they still enter under `espn:` keys) |
| ESPN teams ↔ Highlightly / football-data | 146/146 and 116/116 after 7 hand-pinned overrides |
| ESPN matches ↔ Highlightly / football-data | 314/315 and 202/202 |
| Highlightly box-score players resolved | 28 unresolved of ~2,100 (spelling variants such as Zalazar/Salazar; listed in `dq_unmatched`) |
| **Highlightly vs derived-ESPN minutes**, same player and match | **295 pairs, 98% within 3 minutes, mean absolute difference 0.12** |

That last line is the most important validation in Phase 1: the ESPN minutes derived from substitution clocks agree with Highlightly's reported minutes almost exactly, so ESPN can carry minutes for the ~85% of matches that do not yet have a box score.

**Focus set** (`player_focus_set`): 924 Argentine-league players in squads → 220 in focus by rule (U23 with a start, capped, top-5 minutes at position, or a new starting streak). Everyone abroad is in.

**Recent form already works**: the 28-day window shows, for example, Gastón Benavídez and Kevin Lomónaco going from 1 start to 4 starts with minutes up roughly 200–260%.

## 8. What Phase 2 starts from

1. Cron `alb run daily` and `alb run weekly` (plus `dbt run` and `dbt test`), so Highlightly box scores backfill at ~70/day and history starts accumulating.
2. Change detection over `player_recent_form` and `dim_player` snapshots (dbt snapshots or `raw.records` diffs): minutes up/down, first start, streaks, club/league moves.
3. Load the frozen Transfermarkt CC0 snapshot for multi-season history, transfers, and valuations.
4. Player-level overrides seed (mirror of `team_xref_overrides`) for the `dq_unmatched` leftovers.
5. A first dashboard over the marts.
