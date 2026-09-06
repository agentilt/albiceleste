import streamlit as st
from lib import page, player_link, q

page("Watch feed", "📡")
st.caption("Detected changes for players abroad and for Argentine-league players in the focus set. Facts are computed in SQL; the headline is a template.")

leagues = q("select league, competition_name from marts.dim_competition order by level_rank, league")
types = q("select distinct event_type from marts.player_events order by 1")

f1, f2, f3, f4 = st.columns([2, 2, 1, 1])
sel_league = f1.multiselect("Competition", leagues["competition_name"].tolist(), default=[])
sel_type = f2.multiselect("Event type", types["event_type"].tolist(), default=[])
min_sev = f3.selectbox("Min severity", [1, 2, 3], index=1)
days = f4.selectbox("Days back", [7, 14, 30, 60, 120], index=2)

league_codes = leagues[leagues["competition_name"].isin(sel_league)]["league"].tolist() if sel_league else leagues["league"].tolist()
type_list = sel_type or types["event_type"].tolist()

feed = q(
    """
    select w.event_date, w.severity, w.event_type, w.headline, w.full_name, w.current_team_name, w.current_league, w.player_key, w.focus_reasons
    from marts.watch_feed w
    where w.event_date >= current_date - %s and w.severity >= %s
      and coalesce(w.current_league, w.headline) is not null
      and (w.current_league = any(%s) or w.current_league is null)
      and w.event_type = any(%s)
    order by w.event_date desc, w.severity desc
    limit 500
    """,
    (days, min_sev, league_codes, type_list),
)
st.write(f"{len(feed):,} events")
for _, r in feed.iterrows():
    sev = "🔴" if r["severity"] == 3 else "🟠" if r["severity"] == 2 else "🟡"
    reasons = ", ".join(r["focus_reasons"]) if isinstance(r["focus_reasons"], list) else ""
    st.markdown(
        f"{sev} **{r['event_date']}** · `{r['event_type']}` · "
        + r["headline"].replace(r["full_name"], player_link(r["player_key"], r["full_name"]), 1)
        + (f"  \n<span style='color:#9a9992'>focus: {reasons}</span>" if reasons else ""),
        unsafe_allow_html=True,
    )
