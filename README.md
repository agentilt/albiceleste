# albiceleste

Argentina football intelligence platform. Tracks every player eligible for the senior
Argentina national team across Europe's top five leagues, Brazil and Argentina, and
surfaces what has meaningfully changed. Free data only, local-first, cloud-portable.

Docs: `docs/phase0-data-sources.md` (sources), `docs/phase1-local-platform.md` (platform), `docs/phase2-analytics-product.md` (history, change detection, dashboard), `docs/phase3-publishing.md` (snapshot export, serverless dashboard, deployment).

## Quick start

```bash
cp .env.example .env            # add HIGHLIGHTLY_API_KEY and FOOTBALL_DATA_API_KEY
make up                          # postgres 16 in docker
make sync                        # python 3.12 + deps via uv
make init                        # raw/meta schemas
uv run alb run bootstrap --skip-wikidata   # first load (~15 min, rate-limited)
uv run alb ingest wikidata players && uv run alb ingest wikidata memberships   # ~20 min, run alongside
uv run alb ingest espn backfill  # optional: two seasons of history (1–2 h)
uv run alb ingest transfermarkt load   # optional: frozen Transfermarkt history (one-off)
make dbt-run && make dbt-test    # build analytical models
make verify                      # headline numbers
make publish                     # export marts to data/published/ (2 MB of parquet)
make app                         # Streamlit dashboard on http://localhost:8501, reads the snapshot, no database needed
make status
```

To look at the dashboard only, skip everything above `make app`: the repo ships the latest snapshot in `data/published/`.

## Refresh and publish

```bash
make refresh                     # daily ingest → dbt run → dbt test → publish → page check
git add data/published && git commit -m "data: refresh snapshot" && git push
```

The dashboard is deployable as-is on Streamlit Community Cloud (main file `app/Home.py`, Python 3.12, no secrets); it
installs from `app/requirements.txt` and reads the committed snapshot. See `docs/phase3-publishing.md`.

## Layout

```
app/                    Streamlit dashboard over data/published (Home, Watch Feed, Players Abroad, Player, Focus Set, Presence & Exports, Data Quality, About)
data/published/         Parquet snapshot of the marts + manifest.json, written by `alb publish`, committed
src/albiceleste/        ingestion package (`alb` CLI)
  publish.py            marts → parquet exporter
  ingest/wikidata.py    identity, eligibility evidence, external IDs, career memberships
  ingest/espn.py        squads with citizenship; fixtures; match summaries with per-player stats
  ingest/highlightly.py per-match player box scores (minutes, xG, xA…), quota-aware
  ingest/footballdata.py fixtures, standings, scorers, squads (top 5 + Brazil + UCL)
  ingest/fpl.py         Fantasy Premier League per-gameweek stats (EPL ground truth)
  ingest/transfermarkt.py frozen CC0 Transfermarkt snapshot (history, transfers, valuations)
sql/                    raw.records (versioned JSON), meta.pipeline_runs, meta.api_calls
transform/              dbt project: staging → intermediate → marts
data/raw/               file copy of every payload (S3-style keys), gitignored
docs/                   specs and decisions
```

## Data model in one line

Every API response lands in `raw.records` with a content hash, so history is never
overwritten. dbt staging views parse the latest version; marts build `dim_player`,
`fct_player_match_stats`, `player_recent_form`, `player_events` (change detection),
`player_focus_set`, `argentine_players_abroad`, and the Transfermarkt history marts.

Data attribution: fixtures and standings for European competitions provided by
football-data.org.
