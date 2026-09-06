"""Shared helpers for the Streamlit app: DuckDB over the published Parquet snapshot, palette, chart builders.

The app never talks to Postgres. `alb publish` writes data/published/{marts,meta}/*.parquet plus a manifest;
this module exposes them as DuckDB views (`marts.*`, `meta.*`) and an `as_of()` macro for the data horizon.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path

import altair as alt
import duckdb
import numpy as np
import pandas as pd
import streamlit as st

PUBLISHED = Path(__file__).resolve().parents[1] / "data" / "published"
REPO_URL = "https://github.com/agentilt/albiceleste"

# Validated default palette (dataviz reference instance). One hue for magnitude; slots 1-2 for identity.
BLUE = "#2a78d6"
ORANGE = "#eb6834"
GRAY = "#9a9992"
INK = "#52514e"


@st.cache_resource(show_spinner=False)
def manifest() -> dict:
    path = PUBLISHED / "manifest.json"
    if not path.exists():
        st.error("No published snapshot found. Run `alb publish` (needs the database) to create data/published/.")
        st.stop()
    return json.loads(path.read_text(encoding="utf-8"))


def as_of() -> date:
    return date.fromisoformat(manifest()["data_as_of"])


@st.cache_resource(show_spinner=False)
def _db() -> duckdb.DuckDBPyConnection:
    con = duckdb.connect()
    for schema in ("marts", "meta"):
        con.execute(f"create schema if not exists {schema}")
        for f in sorted((PUBLISHED / schema).glob("*.parquet")):
            con.execute(f"create view {schema}.{f.stem} as select * from read_parquet('{f.as_posix()}')")
    m = manifest()
    con.execute(f"create macro as_of() as DATE '{m['data_as_of']}'")
    con.execute(
        "create table meta.manifest as select ?::date as data_as_of, ?::timestamptz as squad_as_of, ?::timestamptz as exported_at, ?::varchar as git_commit",
        [m["data_as_of"], m["squad_as_of"], m["exported_at"], m.get("git_commit")],
    )
    return con


@st.cache_data(ttl=3600, show_spinner=False)
def q(sql: str, params: tuple | list = ()) -> pd.DataFrame:
    """Run SQL against the snapshot. Placeholders are `?`; list parameters work with list_contains/list_has_any."""
    cur = _db().cursor()
    cur.execute(sql, list(params))
    date_cols = [d[0] for d in cur.description if d[1] == "DATE"]
    df = cur.df()
    for col in date_cols:
        df[col] = pd.to_datetime(df[col]).dt.date
    for col in df.columns:
        if df[col].dtype == object:
            df[col] = df[col].map(lambda v: v.tolist() if isinstance(v, np.ndarray) else v)
    return df


def page(title: str, icon: str = "⚽") -> None:
    st.set_page_config(
        page_title=f"{title} · albiceleste",
        page_icon=icon,
        layout="wide",
        menu_items={"Get help": REPO_URL, "Report a bug": f"{REPO_URL}/issues", "About": "Argentina football intelligence, free data only."},
    )
    m = manifest()
    with st.sidebar:
        st.markdown("**albiceleste**")
        st.caption(f"Matches through **{m['data_as_of']}**  \nSquads as of {str(m['squad_as_of'])[:10]}  \nSnapshot {str(m['exported_at'])[:16].replace('T', ' ')} UTC")
        st.caption(f"[Source code and methodology]({REPO_URL})")
    st.title(title)


def player_url(player_key: str, name: str) -> str:
    return f"/Player?player_key={player_key}&name={name}"


def player_link(player_key: str, name: str) -> str:
    """Markdown link; the URL carries only the key because markdown URLs cannot contain spaces."""
    return f"[{name}](/Player?player_key={player_key})"


def link_col(label: str = "player"):
    """Column config for a player-profile link whose visible text is the name embedded in the URL."""
    return st.column_config.LinkColumn(label, display_text=r"name=(.*)$", width="medium", pinned=True)


def sev_icon(severity: int) -> str:
    return "🔴" if severity == 3 else "🟠" if severity == 2 else "🟡"


def fmt_date(v) -> str:
    if isinstance(v, datetime | date):
        return v.strftime("%Y-%m-%d")
    return str(v)[:10]


def hbar(df: pd.DataFrame, category: str, value: str, title: str, fmt: str = ",.0f", height: int | None = None):
    """Horizontal magnitude bars: one hue, sorted, rounded data-end, direct labels, hover tooltip."""
    if df.empty:
        st.caption("No data yet.")
        return
    st.markdown(f"**{title}**")
    base = alt.Chart(df).encode(
        y=alt.Y(f"{category}:N", sort="-x", title=None, axis=alt.Axis(labelLimit=220, labelOverlap=False)),
        x=alt.X(f"{value}:Q", title=None, axis=alt.Axis(grid=True, gridOpacity=0.25, tickCount=5), scale=alt.Scale(domain=[0, float(df[value].max()) * 1.15])),
        tooltip=[alt.Tooltip(f"{category}:N", title=category.replace("_", " ")), alt.Tooltip(f"{value}:Q", format=fmt, title=value.replace("_", " "))],
    )
    bars = base.mark_bar(color=BLUE, cornerRadiusEnd=4, size=14)
    labels = base.mark_text(align="left", dx=4, color=INK).encode(text=alt.Text(f"{value}:Q", format=fmt))
    st.altair_chart((bars + labels).properties(height=height or max(160, 28 * len(df) + 20)), width="stretch")


def timeline(df: pd.DataFrame, x: str, y: str, title: str, y_title: str, rolling: str | None = None):
    """Single-series trend: thin bars per observation plus an optional rolling line in ink."""
    if df.empty:
        st.caption("No data yet.")
        return
    st.markdown(f"**{title}**")
    base = alt.Chart(df).encode(x=alt.X(f"{x}:T", title=None))
    bars = base.mark_bar(color=BLUE, cornerRadiusEnd=3, size=6, opacity=0.75).encode(
        y=alt.Y(f"{y}:Q", title=y_title, axis=alt.Axis(gridOpacity=0.25)),
        tooltip=[alt.Tooltip(f"{x}:T", title="date"), alt.Tooltip(f"{y}:Q", title=y_title)],
    )
    layers = [bars]
    if rolling and rolling in df.columns:
        layers.append(base.mark_line(color=INK, strokeWidth=2).encode(y=alt.Y(f"{rolling}:Q"), tooltip=[alt.Tooltip(f"{rolling}:Q", format=".0f", title="rolling avg")]))
    st.altair_chart(alt.layer(*layers).properties(height=260), width="stretch")
    if rolling:
        st.caption("Bars: per match. Line: rolling average over the previous 5 appearances.")


def line(df: pd.DataFrame, x: str, y: str, title: str, y_title: str, fmt: str = ",.0f"):
    if df.empty:
        st.caption("No data yet.")
        return
    st.markdown(f"**{title}**")
    ch = alt.Chart(df).mark_line(color=BLUE, strokeWidth=2, point=alt.OverlayMarkDef(size=40, color=BLUE)).encode(
        x=alt.X(f"{x}:T", title=None),
        y=alt.Y(f"{y}:Q", title=y_title, axis=alt.Axis(gridOpacity=0.25, format=fmt)),
        tooltip=[alt.Tooltip(f"{x}:T", title="date"), alt.Tooltip(f"{y}:Q", format=fmt, title=y_title)],
    )
    st.altair_chart(ch.properties(height=240), width="stretch")


def fmt_int(v) -> str:
    try:
        if v is None or (isinstance(v, float) and np.isnan(v)):
            return "–"
        return f"{int(v):,}"
    except (TypeError, ValueError):
        return "–"
