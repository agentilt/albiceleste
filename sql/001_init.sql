-- Idempotent bootstrap of the raw and meta layers. Run with `alb db init`.
CREATE SCHEMA IF NOT EXISTS raw;
CREATE SCHEMA IF NOT EXISTS meta;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Every API response we ever fetched, versioned by content hash. Nothing is overwritten.
CREATE TABLE IF NOT EXISTS raw.records (
  record_id        bigserial PRIMARY KEY,
  source           text        NOT NULL,   -- wikidata | espn | highlightly | fd | fpl
  entity           text        NOT NULL,   -- e.g. player, roster, event, summary, match, boxscore
  source_record_id text        NOT NULL,   -- provider's own id for the record
  payload          jsonb       NOT NULL,
  content_hash     text        NOT NULL,   -- sha256 of canonical payload; new hash = new version
  ingested_at      timestamptz NOT NULL DEFAULT now(),
  run_id           uuid,
  fetched_url      text,
  params           jsonb,
  UNIQUE (source, entity, source_record_id, content_hash)
);
CREATE INDEX IF NOT EXISTS raw_records_lookup
  ON raw.records (source, entity, source_record_id, ingested_at DESC);

-- Latest version of each record. Staging models read from here.
CREATE OR REPLACE VIEW raw.latest AS
SELECT DISTINCT ON (source, entity, source_record_id) *
FROM raw.records
ORDER BY source, entity, source_record_id, ingested_at DESC;

CREATE TABLE IF NOT EXISTS meta.pipeline_runs (
  run_id          uuid PRIMARY KEY,
  command         text        NOT NULL,
  started_at      timestamptz NOT NULL DEFAULT now(),
  finished_at     timestamptz,
  status          text        NOT NULL DEFAULT 'running',  -- running | ok | failed
  records_written integer     NOT NULL DEFAULT 0,
  requests_made   integer     NOT NULL DEFAULT 0,
  error           text
);

CREATE TABLE IF NOT EXISTS meta.api_calls (
  call_id             bigserial PRIMARY KEY,
  run_id              uuid,
  source              text        NOT NULL,
  url                 text        NOT NULL,
  status              integer,
  duration_ms         integer,
  called_at           timestamptz NOT NULL DEFAULT now(),
  ratelimit_remaining integer
);
CREATE INDEX IF NOT EXISTS api_calls_source_time ON meta.api_calls (source, called_at DESC);
