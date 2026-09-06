"""Export the marts (plus a few provenance summaries) to Parquet under data/published/.

The dashboard and any static site read this snapshot, so nothing public needs the database.
Every mart table becomes one Parquet file; a manifest records the data horizon and row counts.
"""
from __future__ import annotations

import json
import subprocess
from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import pyarrow as pa
import pyarrow.parquet as pq

from . import db as dbmod
from .config import get_settings

PUBLISHED_DIR = Path(__file__).resolve().parents[2] / "data" / "published"

# Postgres type -> Arrow type. Anything else is cast to text in SQL.
ARROW_TYPES: dict[str, pa.DataType] = {
    "text": pa.string(),
    "character varying": pa.string(),
    "jsonb": pa.string(),
    "integer": pa.int64(),
    "bigint": pa.int64(),
    "smallint": pa.int64(),
    "numeric": pa.float64(),
    "double precision": pa.float64(),
    "real": pa.float64(),
    "boolean": pa.bool_(),
    "date": pa.date32(),
    "timestamp with time zone": pa.timestamp("us", tz="UTC"),
    "timestamp without time zone": pa.timestamp("us"),
}

# Summaries from the raw/meta schemas (not dbt models), computed at export time for the Data Quality page.
PROVENANCE_QUERIES: dict[str, str] = {
    "raw_summary": """
        select source, entity, count(distinct source_record_id)::bigint as records, count(*)::bigint as versions,
               max(ingested_at) as last_ingested
        from raw.records group by 1, 2 order by 1, 2
    """,
    "pipeline_runs": """
        select started_at, finished_at, command, status, records_written::bigint as records_written,
               requests_made::bigint as requests_made
        from meta.pipeline_runs order by started_at desc limit 30
    """,
    "highlightly_quota": """
        select ratelimit_remaining::bigint as ratelimit_remaining, called_at
        from meta.api_calls where source = 'highlightly' and ratelimit_remaining is not null
        order by called_at desc limit 1
    """,
}


def _columns(conn, schema: str, table: str) -> list[dict[str, Any]]:
    return dbmod.fetch_all(
        conn,
        """
        select column_name, data_type, udt_name from information_schema.columns
        where table_schema = %s and table_name = %s order by ordinal_position
        """,
        (schema, table),
    )


def _arrow_field(col: dict[str, Any]) -> tuple[str, pa.DataType, str]:
    """Return (name, arrow type, select expression) for one Postgres column."""
    name, dtype = col["column_name"], col["data_type"]
    quoted = f'"{name}"'
    if dtype == "ARRAY":
        return name, pa.list_(pa.string()), f"{quoted}::text[]"
    if dtype == "numeric":
        return name, pa.float64(), f"{quoted}::double precision"
    if dtype == "jsonb":
        return name, pa.string(), f"{quoted}::text"
    if dtype in ARROW_TYPES:
        return name, ARROW_TYPES[dtype], quoted
    return name, pa.string(), f"{quoted}::text"


def _export_query(conn, sql: str, path: Path) -> int:
    """Run a query and write the result as Parquet, inferring types from the cursor description."""
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
        names = [d.name for d in cur.description]
    table = pa.Table.from_pylist([dict(r) for r in rows]) if rows else pa.table({n: pa.array([], pa.string()) for n in names})
    pq.write_table(table, path, compression="zstd")
    return table.num_rows


def _export_table(conn, schema: str, table: str, path: Path) -> int:
    fields = [_arrow_field(c) for c in _columns(conn, schema, table)]
    arrow_schema = pa.schema([(n, t) for n, t, _ in fields])
    sql = f'select {", ".join(expr for _, _, expr in fields)} from {schema}."{table}"'
    with conn.cursor() as cur:
        cur.execute(sql)
        rows = cur.fetchall()
    tbl = pa.Table.from_pylist(list(rows), schema=arrow_schema)
    pq.write_table(tbl, path, compression="zstd")
    return tbl.num_rows


def _git_commit() -> str | None:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return None


def export(out_dir: Path | None = None, log=print) -> dict[str, Any]:
    out = out_dir or PUBLISHED_DIR
    (out / "marts").mkdir(parents=True, exist_ok=True)
    (out / "meta").mkdir(parents=True, exist_ok=True)
    manifest: dict[str, Any] = {"exported_at": datetime.now(UTC).isoformat(timespec="seconds"), "git_commit": _git_commit(), "tables": {}}

    with dbmod.connect(get_settings().database_url) as conn:
        horizon = dbmod.fetch_one(
            conn,
            """
            select (select max(match_date) from marts.fct_match where is_completed) as data_as_of,
                   (select max(squad_as_of) from marts.dim_player) as squad_as_of
            """,
        )
        manifest["data_as_of"] = horizon["data_as_of"].isoformat() if horizon and horizon["data_as_of"] else None
        manifest["squad_as_of"] = horizon["squad_as_of"].isoformat(timespec="seconds") if horizon and horizon["squad_as_of"] else None

        tables = [r["table_name"] for r in dbmod.fetch_all(conn, "select table_name from information_schema.tables where table_schema = 'marts' order by 1")]
        for t in tables:
            path = out / "marts" / f"{t}.parquet"
            n = _export_table(conn, "marts", t, path)
            manifest["tables"][f"marts.{t}"] = {"rows": n, "bytes": path.stat().st_size}
            log(f"marts.{t}: {n:,} rows, {path.stat().st_size / 1024:,.0f} KB")
        for name, sql in PROVENANCE_QUERIES.items():
            path = out / "meta" / f"{name}.parquet"
            n = _export_query(conn, sql, path)
            manifest["tables"][f"meta.{name}"] = {"rows": n, "bytes": path.stat().st_size}
            log(f"meta.{name}: {n:,} rows")

    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    total = sum(v["bytes"] for v in manifest["tables"].values())
    log(f"published {len(manifest['tables'])} tables ({total / 1e6:.1f} MB) to {out}; data as of {manifest['data_as_of']}")
    return manifest
