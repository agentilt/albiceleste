"""transfermarkt-datasets (dcaribou, CC0) — frozen snapshot to 2026-07-06.

Static files are downloaded once to data/raw/transfermarkt/ and bulk-loaded into raw_tm.* as text
columns (dbt staging casts them). This is history, not a live feed; do not expect it to refresh.
"""
from __future__ import annotations

import csv
import gzip
from pathlib import Path

from ..log import log
from .base import Context

BASE = "https://pub-e682421888d945d684bcae8890b0ec20.r2.dev/data"
SOURCE = "transfermarkt"
SNAPSHOT_DATE = "2026-07-06"
DEFAULT_TABLES = ["competitions", "clubs", "players", "games", "appearances", "transfers", "player_valuations"]


def _download(ctx: Context, table: str, dest: Path) -> Path | None:
    if dest.exists() and dest.stat().st_size > 0:
        log.info("transfermarkt %s: using cached %s", table, dest)
        return dest
    url = f"{BASE}/{table}.csv.gz"
    dest.parent.mkdir(parents=True, exist_ok=True)
    tmp = dest.with_suffix(".part")
    with ctx.http.client.stream("GET", url, timeout=600) as r:
        if r.status_code != 200:
            log.warning("transfermarkt %s → HTTP %s", url, r.status_code)
            return None
        with tmp.open("wb") as f:
            for chunk in r.iter_bytes(1 << 20):
                f.write(chunk)
    tmp.rename(dest)
    ctx.http.requests_made += 1
    log.info("transfermarkt %s: downloaded %.1f MB", table, dest.stat().st_size / 1e6)
    return dest


def _load_table(ctx: Context, table: str, path: Path) -> int:
    with gzip.open(path, "rt", encoding="utf-8", newline="") as fh:
        header = next(csv.reader(fh))
    cols = [c.strip().lower().replace(" ", "_") for c in header]
    quoted = ", ".join(f'"{c}"' for c in cols)
    with ctx.conn.cursor() as cur:
        cur.execute("create schema if not exists raw_tm")
        cur.execute(f'drop table if exists raw_tm."{table}"')
        cur.execute(
            f'create table raw_tm."{table}" ({", ".join(f'"{c}" text' for c in cols)}, '
            f"snapshot_date date not null default '{SNAPSHOT_DATE}', loaded_at timestamptz not null default now())"
        )
        with gzip.open(path, "rb") as fh, cur.copy(
            f'copy raw_tm."{table}" ({quoted}) from stdin with (format csv, header true, null \'\')'
        ) as cp:
            while chunk := fh.read(1 << 20):
                cp.write(chunk)
        cur.execute(f'select count(*) from raw_tm."{table}"')
        n = cur.fetchone()["count"]
    ctx.conn.commit()
    return n


def load(ctx: Context, tables: list[str] | None = None) -> int:
    tables = tables or DEFAULT_TABLES
    root = ctx.settings.raw_dir / SOURCE / f"dt={SNAPSHOT_DATE}"
    total = 0
    for t in tables:
        path = _download(ctx, t, root / f"{t}.csv.gz")
        if not path:
            continue
        n = _load_table(ctx, t, path)
        total += n
        ctx.stats[f"{SOURCE}.{t}"] = n
        log.info("transfermarkt %s: %d rows loaded into raw_tm.%s", t, n, t)
    ctx.records_written += total
    return total
