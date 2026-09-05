from __future__ import annotations

import hashlib
import json
import uuid
from collections.abc import Iterable, Sequence
from pathlib import Path
from typing import Any

import psycopg
from psycopg.rows import dict_row
from psycopg.types.json import Jsonb


def canonical_hash(payload: Any) -> str:
    blob = json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False, default=str)
    return hashlib.sha256(blob.encode("utf-8")).hexdigest()


def connect(url: str) -> psycopg.Connection:
    return psycopg.connect(url, row_factory=dict_row)


def run_sql_file(conn: psycopg.Connection, path: Path) -> None:
    conn.execute(path.read_text(encoding="utf-8"))
    conn.commit()


def start_run(conn: psycopg.Connection, command: str) -> uuid.UUID:
    run_id = uuid.uuid4()
    conn.execute(
        "INSERT INTO meta.pipeline_runs (run_id, command) VALUES (%s, %s)",
        (run_id, command),
    )
    conn.commit()
    return run_id


def finish_run(
    conn: psycopg.Connection,
    run_id: uuid.UUID,
    status: str,
    records_written: int,
    requests_made: int,
    error: str | None = None,
) -> None:
    conn.execute(
        """
        UPDATE meta.pipeline_runs
           SET finished_at = now(), status = %s, records_written = %s,
               requests_made = %s, error = %s
         WHERE run_id = %s
        """,
        (status, records_written, requests_made, error, run_id),
    )
    conn.commit()


def log_api_call(
    conn: psycopg.Connection,
    run_id: uuid.UUID | None,
    source: str,
    url: str,
    status: int | None,
    duration_ms: int,
    ratelimit_remaining: int | None,
) -> None:
    conn.execute(
        """
        INSERT INTO meta.api_calls (run_id, source, url, status, duration_ms, ratelimit_remaining)
        VALUES (%s, %s, %s, %s, %s, %s)
        """,
        (run_id, source, url, status, duration_ms, ratelimit_remaining),
    )


def insert_raw(
    conn: psycopg.Connection,
    rows: Sequence[tuple[str, str, str, Any, str, uuid.UUID | None, str | None, Any]],
) -> int:
    """rows: (source, entity, source_record_id, payload, content_hash, run_id, fetched_url, params).
    Returns the number of NEW versions written (unchanged payloads are skipped)."""
    if not rows:
        return 0
    with conn.cursor() as cur:
        cur.executemany(
            """
            INSERT INTO raw.records
              (source, entity, source_record_id, payload, content_hash, run_id, fetched_url, params)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (source, entity, source_record_id, content_hash) DO NOTHING
            """,
            [(s, e, i, Jsonb(p), h, r, u, Jsonb(q) if q is not None else None) for s, e, i, p, h, r, u, q in rows],
        )
        written = cur.rowcount if cur.rowcount is not None and cur.rowcount >= 0 else 0
    return written


def fetch_all(conn: psycopg.Connection, sql: str, params: Iterable[Any] | None = None) -> list[dict]:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return list(cur.fetchall())


def fetch_one(conn: psycopg.Connection, sql: str, params: Iterable[Any] | None = None) -> dict | None:
    with conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()
