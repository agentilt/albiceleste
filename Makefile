.PHONY: up down init sync status bootstrap daily weekly dbt-run dbt-test dbt-docs psql verify publish web web-build refresh

up:            ## start postgres
	docker compose up -d
down:
	docker compose down
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
psql:          ## psql inside the container
	docker compose exec postgres psql -U alb -d albiceleste
publish:       ## export marts to data/published/ (parquet snapshot the app reads)
	uv run alb publish
web:           ## next.js dev server on :3000 (reads data/published, no database needed)
	npm run dev --workspace=web
web-build:     ## production build of the site through turborepo
	npx turbo run build --filter=web
refresh: daily dbt-run dbt-test publish web-build  ## ingest, rebuild, re-export, build the site
verify:        ## headline sanity checks
	docker compose exec -T postgres psql -U alb -d albiceleste -f - < sql/verify.sql
