from __future__ import annotations

import uuid
from collections.abc import Iterable
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any

import psycopg

from .. import db as dbmod
from ..config import Settings, get_settings
from ..http import Http
from ..log import log, setup_logging
from ..rawstore import RawStore


@dataclass
class RawRecord:
    source: str
    entity: str
    source_record_id: str
    payload: Any
    fetched_url: str | None = None
    params: dict | None = None


@dataclass
class Context:
    settings: Settings
    conn: psycopg.Connection
    http: Http
    raw: RawStore
    run_id: uuid.UUID
    records_written: int = 0
    stats: dict[str, int] = field(default_factory=dict)

    def save(self, records: Iterable[RawRecord]) -> int:
        recs = list(records)
        rows = []
        for r in recs:
            h = dbmod.canonical_hash(r.payload)
            rows.append((r.source, r.entity, r.source_record_id, r.payload, h, self.run_id, r.fetched_url, r.params))
            self.raw.write(r.source, r.entity, r.source_record_id, r.payload)
        written = dbmod.insert_raw(self.conn, rows)
        self.conn.commit()
        self.records_written += written
        for r in recs:  # attribute submitted counts per entity (new-version count is only known in total)
            key = f"{r.source}.{r.entity}"
            self.stats[key] = self.stats.get(key, 0) + 1
        return written

    def query(self, sql: str, params: Iterable[Any] | None = None) -> list[dict]:
        return dbmod.fetch_all(self.conn, sql, params)


@contextmanager
def make_context(command: str, settings: Settings | None = None):
    settings = settings or get_settings()
    setup_logging()
    conn = dbmod.connect(settings.database_url)
    run_id = dbmod.start_run(conn, command)

    def on_call(source: str, url: str, status: int | None, ms: int, remaining: int | None) -> None:
        # Log API calls on a separate autocommit connection so a failed batch never loses the audit trail.
        try:
            dbmod.log_api_call(conn, run_id, source, url, status, ms, remaining)
            conn.commit()
        except psycopg.Error as exc:  # pragma: no cover
            log.warning("could not log api call: %s", exc)

    http = Http(settings.user_agent, on_call=on_call)
    ctx = Context(settings=settings, conn=conn, http=http, raw=RawStore(settings.raw_dir, settings.write_raw_files), run_id=run_id)
    log.info("run %s — %s", run_id, command)
    try:
        yield ctx
    except Exception as exc:
        conn.rollback()
        dbmod.finish_run(conn, run_id, "failed", ctx.records_written, http.requests_made, repr(exc)[:2000])
        log.exception("run failed")
        raise
    else:
        dbmod.finish_run(conn, run_id, "ok", ctx.records_written, http.requests_made)
        log.info("run ok — %d new raw versions, %d requests %s", ctx.records_written, http.requests_made, ctx.stats or "")
    finally:
        http.close()
        conn.close()
