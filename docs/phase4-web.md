# Phase 4 — The web product

**Date:** 2026-09-06
**Deliverable:** a statically generated Next.js site over the Parquet snapshot, built in a Turborepo, deployed on Vercel. Streamlit is gone.

## Decision

Streamlit got the data in front of people quickly, but it caps design control, looks like every other Streamlit app, and Community
Cloud apps sleep when idle. The user's call: a proper design, no generic "AI slop" look, faster builds through Turborepo, Vercel for hosting.
The approach is **functional site first, design layer second**: pages, data access and interactivity are done in this phase with a neutral
typographic baseline and design tokens; the visual design is applied on top afterwards without touching the data layer.

## Shape

```
package.json            npm workspaces + turbo scripts
turbo.json              build / typecheck / dev tasks; build inputs include ../../data/published/**
packages/data/          @albiceleste/data: DuckDB (@duckdb/node-api) over data/published, typed queries per page
apps/web/               Next.js 16 (App Router, Turbopack), Tailwind v4 tokens, hand-rolled SVG charts
```

- **Everything is static.** Every page is prerendered at build time (`○` static or `●` SSG). The player route uses `generateStaticParams`
  with `dynamicParams = false`, so 1,176 player pages exist as HTML and unknown keys 404 without executing code. DuckDB runs only during
  the build; it is declared in `serverExternalPackages` so it is never bundled, and filesystem calls are marked `turbopackIgnore` so
  Turbopack does not trace the whole repository into the server output.
- **Data package.** `rows<T>(sql, params)` converts DuckDB values to plain JSON: bigint → number, DATE → `YYYY-MM-DD`, TIMESTAMPTZ → ISO,
  LIST → array. An `as_of()` SQL macro is created from the manifest so "last 7 days" means the last 7 days of data. The published directory
  is found by walking up from the working directory, or from `ALB_PUBLISHED_DIR`.
- **Pages.** `/` (hero, headline numbers, where players abroad are, latest feed, biggest movers), `/feed` (client-side filters over the
  full watch feed), `/abroad` and `/focus` (client-side filtered, sortable tables), `/players/[key]` (season lines, minutes timeline,
  recent matches, rolling form, events, career, transfers, market value, source ids), `/exports`, `/quality`, `/about`. A player search
  in the header loads `/players/index.json` (a static route handler) on first focus and filters client-side with accent folding.
- **Tables.** Two components: `StaticTable` (server-rendered, formatter functions, for fixed data) and `SortableTable` (client, takes a
  serialisable column spec so server pages can hand it a layout). Numbers are right-aligned with tabular figures.
- **Charts.** Server-rendered SVG with `d3-scale` and `d3-shape` only: horizontal bars, per-match minutes with a rolling line, a line
  chart. No chart library, no client JS for charts.
- **Fonts.** Fraunces for display, IBM Plex Sans for text, IBM Plex Mono for data labels, loaded through `next/font`.

## Build and deploy

```bash
npm install                      # workspaces
npx turbo run build --filter=web # ~15 s locally; Turborepo caches by inputs, including the snapshot
npm run dev --workspace=web      # http://localhost:3000
```

Vercel: project `albiceleste` (team agentilts-projects), root directory `apps/web`, framework Next.js, Node 22, GitHub repo connected so
every push to `main` deploys to production. Production alias: https://albiceleste-rho.vercel.app (the bare name was taken). Vercel installs at
the repository root (npm workspaces), runs the build inside the app, and the build reads `../../data/published` ("include files outside the
root directory" is on). Refreshing the site is `make refresh` (ingest → dbt → publish → build), then commit and push `data/published/`.

Two things learned deploying from the CLI: run `vercel` from the repository root, not from `apps/web` (with a root directory set, the CLI
resolves it relative to the current directory); and the CLI does not honour the `**/data/raw/` gitignore pattern, so `.vercelignore` lists the
raw mirror, the virtualenv and build outputs explicitly (the first attempt tried to upload 27,594 raw JSON files).

Deployment protection is Vercel's default "standard" setting: unique deployment URLs and previews require a Vercel login, the production alias
is public. To hide the site while the design is being finished, switch Project Settings → Deployment Protection to "all deployments".

Page weight to revisit in the design phase: `/feed` (398 KB HTML, 620 events embedded) and `/quality` (504 KB, 717 unmatched rows) should be
paginated or split.

CI builds the site on every push with `turbo run typecheck build`, so a query that no longer matches a mart column fails the build, not the site.

## Removed

`app/` (Streamlit), `scripts/check_app.py`, `.streamlit/`, and the Python dependencies streamlit, pandas, altair, tabulate and duckdb.
The Python side is now ingestion, dbt and `alb publish` only.

## Next

- Design layer: typography scale, spacing, colour, a distinctive identity for tables and charts, mobile layout. Tokens live in
  `apps/web/app/globals.css`; components only reference tokens.
- Open Graph images per player, a sitemap, and `robots.txt` once the design is in.
