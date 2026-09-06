# Phase 3 — Publishing without a server

**Date:** 2026-09-06
**Deliverable:** a Parquet snapshot of the marts, a dashboard that runs from it with no database, and a free deployment path.

## Why a snapshot

The product is a reference view of eligible players plus a feed of what changed. Both are fine as a snapshot that is
refreshed whenever the pipeline runs, provided every page shows its data horizon. A snapshot also settles two problems at once:

- **Free hosting.** The database is 859 MB, most of it raw JSON and the Transfermarkt import. The marts are 2.3 MB.
  Free Postgres tiers (Neon, Supabase) cap at about 0.5 GB and pause when idle; nothing public needs the raw layers anyway.
- **Local memory.** Docker Desktop's VM may grow to half the machine's RAM during builds and holds it. With the snapshot,
  Postgres only has to run while ingesting and building; the dashboard works with Docker stopped.

| Layer | Size in Postgres | Published |
|---|---|---|
| raw (ESPN, Highlightly, Wikidata, FD, FPL) | 453 MB | no |
| raw_tm (Transfermarkt CC0) | 353 MB | no |
| intermediate | 17 MB | no |
| marts | 23 MB | yes, 2.3 MB as zstd Parquet |

## What was built

| Piece | Where | Notes |
|---|---|---|
| Exporter | `src/albiceleste/publish.py`, `alb publish`, `make publish` | Every `marts.*` table → `data/published/marts/<table>.parquet` with an explicit Arrow schema (numeric → double, jsonb → text, text[] → list). Four `meta/*.parquet` summaries from `raw.records` and `meta.*` for the Data Quality page. `manifest.json` records `data_as_of` (last completed match), `squad_as_of`, export time, git commit and row counts. |
| Standalone app | `app/lib.py` | DuckDB in-memory, one view per Parquet file (`marts.*`, `meta.*`), an `as_of()` macro so "last 7 days" means the last 7 days of data, not of wall-clock time. No `psycopg`, no pipeline import; `app/requirements.txt` lists the five libraries the app needs. |
| Query dialect | all pages | Postgres → DuckDB: `?` placeholders, `list_contains` / `list_has_any` for multiselect filters, no empty-array tricks (the page passes the full option list instead). |
| Agreement metric | `marts.dq_minutes_agreement` | The Highlightly-vs-ESPN minutes comparison used to be an ad-hoc join over two staging views that took minutes. Both staging models are now materialized as tables and the metric is a mart. |
| Presentation pass | `app/pages/*` | Sortable dataframes with clickable player names instead of markdown tables; number formats; sidebar with data horizon and repo link; an About page with sources, attribution, eligibility rules, matching rules and limitations. |
| Refresh | `make refresh` | `daily` ingest → `dbt run` → `dbt test` → `publish` → `app-check`. Commit `data/published/` to publish. |
| CI | `.github/workflows/ci.yml` | Runs every page headlessly against the committed snapshot, so a broken query fails the build. |

## Deploying to Streamlit Community Cloud

1. Sign in at share.streamlit.io with GitHub and pick `agentilt/albiceleste`, branch `main`, main file `app/Home.py`.
2. Advanced settings: Python 3.12. No secrets are needed; the app reads only the committed snapshot.
3. Community Cloud finds `app/requirements.txt` before the root `uv.lock` (entrypoint directory wins), so it installs only the app libraries.

Refreshing the site is `make refresh`, then commit and push `data/published/`. The app reloads on push.

## Trade-offs recorded

- **Snapshot in git.** Each refresh adds about 2–3 MB of Parquet to history. Weekly refreshes cost roughly 150 MB a year, which is
  acceptable for now; if it becomes a problem, the exporter can upload to a GitHub Release asset and the app can fetch it at start.
- **DuckDB result types.** Dates come back as `datetime64`; `q()` converts `DATE` columns to `date` objects using the cursor
  description so tables and headlines print `2026-09-05`, not a timestamp. Lists come back as numpy arrays and are converted to lists.
- **Streamlit as the public face is provisional.** It is the fastest free path to a public link and doubles as the internal data-quality
  console, but it caps design control and Community Cloud apps sleep when idle. The public frontend choice is open: see the
  Phase 5 note in `phase2-analytics-product.md` and the discussion in the project README.
