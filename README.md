# albiceleste

Argentina football intelligence platform. Follows every player eligible for the senior
Argentina national team across fourteen leagues, match by match, and answers one question:
who is in form for the next squad, who is falling out of it, and who is knocking on the door.
Free data only, local-first, bilingual static site on Vercel (https://albiceleste-rho.vercel.app).

Docs: `docs/phase0-data-sources.md` (sources), `docs/phase1-local-platform.md` (platform), `docs/phase2-analytics-product.md` (history, change detection), `docs/phase3-publishing.md` (Parquet snapshot), `docs/phase4-web.md` (Next.js, Turborepo, Vercel), `docs/page-briefs.md` (the product spec), `docs/phase5-data.md` (ranking, states, windows, movers, trajectory), `docs/phase6-site.md` (the eight pages).

## Quick start

```bash
cp .env.example .env            # add HIGHLIGHTLY_API_KEY and FOOTBALL_DATA_API_KEY
make up                          # postgres 16 from Homebrew (brew install postgresql@16); `make up-docker` for the compose alternative
make sync                        # python 3.12 + deps via uv
make init                        # raw/meta schemas
uv run alb run bootstrap --skip-wikidata   # first load (~15 min, rate-limited)
uv run alb ingest wikidata players && uv run alb ingest wikidata memberships   # ~20 min, run alongside
uv run alb ingest espn backfill  # optional: two seasons of history (1–2 h)
uv run alb ingest transfermarkt load   # optional: frozen Transfermarkt history (one-off)
make dbt-run && make dbt-test    # build analytical models
make verify                      # headline numbers
make publish                     # export marts to data/published/ (2 MB of parquet)
make status
```

## The site

```bash
npm install                      # npm workspaces: apps/web (Next.js) + packages/data (DuckDB over the snapshot)
make web                         # dev server on http://localhost:3000, reads data/published, no database needed
make web-build                   # production build through turborepo (~25 s; 3,691 static pages in es and en)
```

To look at the site only, skip the pipeline: the repo ships the latest snapshot in `data/published/`.

## Refresh and publish

```bash
make refresh                     # daily ingest → dbt run → dbt test → publish → site build
git add data/published && git commit -m "data: refresh snapshot" && git push   # Vercel rebuilds on push
```

## Layout

```
apps/web/               Next.js site (App Router, /es and /en, static generation) over data/published
packages/data/          @albiceleste/data: typed DuckDB queries used at build time
packages/ui/            @albiceleste/ui: design system (tokens, tables, charts, rank rows); synced to Claude Design
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
`player_rank_history` and `player_state` (the ranking and the form states), `movers`,
`player_trajectory` (the under-23 cohort), `player_next_match`, the hand-kept windows and
squad lists, and the Transfermarkt history marts.

Data attribution: fixtures and standings for European competitions provided by
football-data.org.
