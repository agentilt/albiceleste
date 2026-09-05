.PHONY: up down init sync status bootstrap daily weekly dbt-run dbt-test dbt-docs psql verify

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
verify:        ## headline sanity checks
	docker compose exec -T postgres psql -U alb -d albiceleste -f - < sql/verify.sql
