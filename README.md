# albiceleste

Argentina football intelligence platform. Tracks every player eligible for the senior
Argentina national team across Europe's top five leagues, Brazil and Argentina, and
surfaces what has meaningfully changed. Free data only, local-first, cloud-portable.

Phase 0 (data sources) is documented in `docs/phase0-data-sources.md`.
Phase 1 (this repo state) is the local data platform: ingestion → Postgres → dbt models.

## Quick start

```bash
cp .env.example .env            # add HIGHLIGHTLY_API_KEY and FOOTBALL_DATA_API_KEY
make up                          # postgres 16 in docker
make sync                        # python 3.12 + deps via uv
make init                        # raw/meta schemas
uv run alb run bootstrap --skip-wikidata   # first load (~15 min, rate-limited)
uv run alb ingest wikidata players && uv run alb ingest wikidata memberships   # ~20 min, run alongside
make dbt-run && make dbt-test    # build analytical models
make verify                      # headline numbers
make status
```

## Layout

```
src/albiceleste/        ingestion package (`alb` CLI)
  ingest/wikidata.py    identity, eligibility evidence, external IDs, career memberships
  ingest/espn.py        squads with citizenship; fixtures; match summaries with per-player stats
  ingest/highlightly.py per-match player box scores (minutes, xG, xA…), quota-aware
  ingest/footballdata.py fixtures, standings, scorers, squads (top 5 + Brazil + UCL)
  ingest/fpl.py         Fantasy Premier League per-gameweek stats (EPL ground truth)
sql/                    raw.records (versioned JSON), meta.pipeline_runs, meta.api_calls
transform/              dbt project: staging → intermediate → marts
data/raw/               file copy of every payload (S3-style keys), gitignored
docs/                   specs and decisions
```

## Data model in one line

Every API response lands in `raw.records` with a content hash, so history is never
overwritten. dbt staging views parse the latest version; marts build `dim_player`,
`fct_player_match_stats`, `argentine_players_abroad`, `player_recent_form` and friends.

Data attribution: fixtures and standings for European competitions provided by
football-data.org.
