"""Shared helpers for the Streamlit app: cached SQL, palette, small chart builders."""
from __future__ import annotations

from decimal import Decimal

import altair as alt
import pandas as pd
import psycopg
import streamlit as st
from psycopg.rows import dict_row

from albiceleste.config import get_settings

# Validated default palette (dataviz reference instance). One hue for magnitude; slots 1-2 for identity.
BLUE = "#2a78d6"
ORANGE = "#eb6834"
GRAY = "#9a9992"
INK = "#52514e"


@st.cache_data(ttl=300, show_spinner=False)
def q(sql: str, params: tuple = ()) -> pd.DataFrame:
    with psycopg.connect(get_settings().database_url, row_factory=dict_row) as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        rows = cur.fetchall()
    df = pd.DataFrame(rows)
    # psycopg returns numeric as Decimal; charts and arithmetic want floats
    for col in df.columns:
        if df[col].dtype == object and df[col].map(lambda v: isinstance(v, Decimal)).any():
            df[col] = df[col].map(lambda v: float(v) if isinstance(v, Decimal) else v)
    return df


def page(title: str, icon: str = "⚽") -> None:
    st.set_page_config(page_title=f"{title} · albiceleste", page_icon=icon, layout="wide")
    st.title(title)


def player_link(player_key: str, name: str) -> str:
    return f"[{name}](/Player?player_key={player_key})"


def hbar(df: pd.DataFrame, category: str, value: str, title: str, fmt: str = ",.0f", height: int | None = None):
    """Horizontal magnitude bars: one hue, sorted, rounded data-end, direct labels, hover tooltip."""
    if df.empty:
        st.caption("No data yet.")
        return
    base = alt.Chart(df).encode(
        y=alt.Y(f"{category}:N", sort="-x", title=None, axis=alt.Axis(labelLimit=220)),
        x=alt.X(f"{value}:Q", title=None, axis=alt.Axis(grid=True, gridOpacity=0.25, tickCount=5)),
        tooltip=[alt.Tooltip(f"{category}:N", title=category.replace("_", " ")), alt.Tooltip(f"{value}:Q", format=fmt, title=value.replace("_", " "))],
    )
    bars = base.mark_bar(color=BLUE, cornerRadiusEnd=4, size=14)
    labels = base.mark_text(align="left", dx=4, color=INK).encode(text=alt.Text(f"{value}:Q", format=fmt))
    st.altair_chart((bars + labels).properties(title=title, height=height or max(120, 22 * len(df))), width="stretch")


def timeline(df: pd.DataFrame, x: str, y: str, title: str, y_title: str, rolling: str | None = None):
    """Single-series trend: thin bars per observation plus an optional rolling line in ink."""
    if df.empty:
        st.caption("No data yet.")
        return
    base = alt.Chart(df).encode(x=alt.X(f"{x}:T", title=None))
    bars = base.mark_bar(color=BLUE, cornerRadiusEnd=3, size=6, opacity=0.75).encode(
        y=alt.Y(f"{y}:Q", title=y_title, axis=alt.Axis(gridOpacity=0.25)),
        tooltip=[alt.Tooltip(f"{x}:T", title="date"), alt.Tooltip(f"{y}:Q", title=y_title)],
    )
    layers = [bars]
    if rolling and rolling in df.columns:
        layers.append(base.mark_line(color=INK, strokeWidth=2).encode(y=alt.Y(f"{rolling}:Q"), tooltip=[alt.Tooltip(f"{rolling}:Q", format=".0f", title="rolling avg")]))
    st.altair_chart(alt.layer(*layers).properties(title=title, height=260), width="stretch")
    if rolling:
        st.caption("Bars: per match. Line: rolling average over the previous 5 appearances.")


def line(df: pd.DataFrame, x: str, y: str, title: str, y_title: str, fmt: str = ",.0f"):
    if df.empty:
        st.caption("No data yet.")
        return
    ch = alt.Chart(df).mark_line(color=BLUE, strokeWidth=2, point=alt.OverlayMarkDef(size=40, color=BLUE)).encode(
        x=alt.X(f"{x}:T", title=None),
        y=alt.Y(f"{y}:Q", title=y_title, axis=alt.Axis(gridOpacity=0.25, format=fmt)),
        tooltip=[alt.Tooltip(f"{x}:T", title="date"), alt.Tooltip(f"{y}:Q", format=fmt, title=y_title)],
    )
    st.altair_chart(ch.properties(title=title, height=240), width="stretch")


def fmt_int(v) -> str:
    try:
        return f"{int(v):,}"
    except (TypeError, ValueError):
        return "–"
