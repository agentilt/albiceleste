# Phase 2 — Analytics Product

**Date:** 2026-09-05
**Deliverable:** history, change detection, Transfermarkt import, player overrides, a local dashboard, license and CI.

## What was built

| Piece | Where | Notes |
|---|---|---|
| ESPN history backfill | `alb ingest espn backfill` | Scoreboards, summaries and athlete profiles for 2024-07-01 → 2026-06-30 (two seasons). Idempotent; re-run to resume. |
| Athlete profiles | `stg_espn__athletes`, `int_espn_athletes` | Players seen in match history but on no current roster get citizenship/DOB, so departed Argentines still resolve. |
| Change detection | `int_player_match_sequence`, `player_events`, `watch_feed` | See below. |
| Transfermarkt CC0 snapshot | `alb ingest transfermarkt load` → `raw_tm.*` → `stg_tm__*` | 2.9M rows; frozen 2026-07-06. Crosswalk `int_player_xref_tm` (Wikidata id first, then DOB + name). |
| History marts | `player_season_history`, `player_career_history`, `player_market_values`, `argentine_export_pipeline`, `argentine_export_summary`, `argentine_exporting_clubs` | Multi-season stats, transfers with fees, valuations, and the export pipeline for every Argentine in the snapshot. |
| Player overrides | `seeds/player_xref_overrides.csv` | Hand-pinned Highlightly → ESPN identities (nicknames, spellings, transliterations). Highlightly resolution also gained same-league and any-league passes. |
| Dashboard | `app/` (Streamlit), `make app`, `make app-check` | Home, Watch Feed, Players Abroad, Player, Focus Set, Presence & Exports, Data Quality. Every page runs headlessly in `scripts/check_app.py`. |
| Repo hygiene | `LICENSE` (MIT), `.github/workflows/ci.yml` (ruff + `dbt parse`), ruff config | |

## Change detection design

`int_player_match_sequence` orders each tracked player's matches and derives: previous team and competition level, days since the previous appearance, how many team matches were missed in between, consecutive starts (a streak breaks on a non-start or on a team match without the player), consecutive scoring appearances, starts so far this season, appearances so far in the league.

`player_events` emits one row per detected event with `evidence` (the numbers) and a templated `headline`:

| event_type | rule | severity |
|---|---|---|
| `club_change` | first match for a new team; compares competition `level_rank` (stronger / weaker) | 2, 3 if level changed |
| `first_start_of_season` | first start in a league-season | 1 |
| `consecutive_starts` | streak reaches 3 / 5 / 10 | 1 / 2 / 3 |
| `scoring_streak` | goals in 3 / 5 consecutive appearances | 2 / 3 |
| `multi_goal_match` | 2+ goals (3+ = hat-trick) | 2 / 3 |
| `return_after_absence` | played after ≥60 days and ≥5 team matches missed | 2 |
| `debut_in_league` | first appearance in a league within our data, ≥45 days after the data horizon | 2 |
| `minutes_surge` | 28-day minutes ≥180 and ≥ +50% vs the previous 28 days | 2, 3 if ≥ +100% |
| `minutes_drop` | previous 28-day minutes ≥180 and ≤ −50% | 2, 3 if ≤ −75% |

A→B→A club changes within 30 days are suppressed: that pattern is one ESPN athlete id shared by two people, not a transfer. `watch_feed` filters events to focus-set players (everyone abroad plus rule-based Argentine-league players), last 60 days.

## Decisions and deviations

- **Dashboard tool changed from Evidence to Streamlit.** Evidence's open-source npm package last shipped in February 2026; the current CLI requires an account, a hosted Studio, and TLS-only database connectors. Streamlit keeps everything Python, local and free. The Phase 5 frontend decision (Next.js) is unchanged.
- **Player display names prefer ESPN's** (`dim_player.full_name`), with the Wikidata label kept as `source_name`. Wikidata labels are occasionally odd ("nisola gaitani").
- **Minutes share denominator** counts matches of any team the player appeared for in the window (or his current club), capped at 100%. Exact per-date team attribution was correct but too slow to build on every run.
- **Charts** follow the dataviz reference palette: one hue for magnitude, ink for overlays, direct labels, tooltips, no dual axes.

## Known limitations

- ESPN history is fetched at roughly 75 requests per minute; the two-season backfill (about 5,400 summaries plus athlete profiles) takes 1–2 hours. If interrupted, run `alb ingest espn backfill` again.
- Window-based events (`minutes_surge`/`minutes_drop`) are as of the build date; only match-based events have historical dates. A daily build makes them accumulate.
- Transfermarkt destination country is unknown for moves to leagues outside the snapshot's 65 competitions ("other / not covered").
- Highlightly box-score backlog still clears at ~70 per day; until then most 2026 rows are ESPN-sourced (`stats_source`).
