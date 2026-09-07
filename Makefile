.PHONY: up down init sync status bootstrap daily weekly dbt-run dbt-test dbt-docs psql verify publish web web-build refresh

up:            ## start postgres (Homebrew; see docs/phase5-data.md for why not Docker)
	brew services start postgresql@16
down:
	brew services stop postgresql@16
up-docker:     ## alternative: postgres in docker (memory-capped by the Docker VM)
	docker compose up -d
sync:          ## install python deps (uv)
	uv sync
init: up       ## create schemas/tables
	uv run alb db init
status:
	uv run alb db status
bootstrap:     ## first full load (slow: rate limits)
	uv run alb run bootstrap
daily:
	uv run alb run daily
weekly:
	uv run alb run weekly
dbt-run:
	cd transform && uv run dbt run
dbt-test:
	cd transform && uv run dbt test
dbt-docs:
	cd transform && uv run dbt docs generate && uv run dbt docs serve
psql:          ## psql on the local server
	/opt/homebrew/opt/postgresql@16/bin/psql -U alb -d albiceleste
publish:       ## export marts to data/published/ (parquet snapshot the app reads)
	uv run alb publish
web:           ## next.js dev server on :3000 (reads data/published, no database needed)
	npm run dev --workspace=web
web-build:     ## production build of the site through turborepo
	npx turbo run build --filter=web
refresh: daily dbt-run dbt-test publish web-build  ## ingest, rebuild, re-export, build the site
verify:        ## headline sanity checks
	/opt/homebrew/opt/postgresql@16/bin/psql -U alb -d albiceleste -f sql/verify.sql
