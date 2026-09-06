.PHONY: up down init sync status bootstrap daily weekly dbt-run dbt-test dbt-docs psql verify publish app app-check refresh

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
app:           ## streamlit dashboard on :8501 (reads data/published, no database needed)
	uv run streamlit run app/Home.py
app-check:     ## run every page headlessly against the snapshot
	uv run python scripts/check_app.py
refresh: daily dbt-run dbt-test publish app-check  ## ingest, rebuild, re-export, check
verify:        ## headline sanity checks
	docker compose exec -T postgres psql -U alb -d albiceleste -f - < sql/verify.sql
