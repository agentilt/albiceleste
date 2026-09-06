import streamlit as st
from lib import fmt_date, fmt_int, hbar, link_col, page, player_link, player_url, q, sev_icon

page("Argentina football intelligence", "🇦🇷")
st.caption(
    "Every player eligible for Argentina's senior national team across Europe's top five leagues, Brazil and Argentina: "
    "where they play, how much they play, and what has changed. Free data only; every number traces back to a source record."
)

kpi = q(
    """
    select
      (select count(*) from marts.dim_player where eligibility_status in ('eligible','review')) as eligible,
      (select count(*) from marts.dim_player where in_tracked_squad) as in_squads,
      (select count(*) from marts.dim_player where is_abroad) as abroad,
      (select count(*) from marts.player_focus_set where in_focus) as in_focus,
      (select count(*) from marts.player_events where event_date >= as_of() - 7) as events_7d,
      (select count(*) from marts.fct_match where is_completed) as matches
    """
).iloc[0]

c = st.columns(6)
c[0].metric("Eligible players known", fmt_int(kpi["eligible"]))
c[1].metric("In tracked squads", fmt_int(kpi["in_squads"]))
c[2].metric("Playing abroad", fmt_int(kpi["abroad"]))
c[3].metric("In focus set", fmt_int(kpi["in_focus"]))
c[4].metric("Events, last 7 days", fmt_int(kpi["events_7d"]))
c[5].metric("Matches in data", fmt_int(kpi["matches"]))

left, right = st.columns([1, 1])
with left:
    pres = q("select competition, country, players from marts.argentine_league_presence order by players desc")
    abroad = pres[pres["country"] != "Argentina"]
    hbar(abroad, "competition", "players", "Eligible players in current squads abroad")
    home = pres[pres["country"] == "Argentina"]
    if not home.empty:
        st.caption(f"Not shown: {int(home['players'].sum()):,} eligible players in {home['competition'].iloc[0]} squads. The focus set keeps that league from flooding the feed.")
with right:
    st.subheader("Latest on the watch feed")
    feed = q(
        """
        select event_date, severity, headline, player_key, full_name
        from marts.watch_feed order by event_date desc, severity desc limit 12
        """
    )
    if feed.empty:
        st.caption("No events yet.")
    for _, r in feed.iterrows():
        st.markdown(f"{sev_icon(r['severity'])} **{fmt_date(r['event_date'])}** · {r['headline'].replace(r['full_name'], player_link(r['player_key'], r['full_name']), 1)}")
    st.page_link("pages/1_Watch_Feed.py", label="Open the full feed →")

st.subheader("Biggest movers, last 28 days (players abroad)")
movers = q(
    """
    select d.full_name, d.current_team_name as team, d.current_competition as competition, f.minutes, f.prev_minutes,
           f.minutes_change_pct, f.starts, f.prev_starts, f.minutes_share_pct, d.player_key
    from marts.player_recent_form f join marts.dim_player d using (player_key)
    where f.window_days = 28 and d.is_abroad and (f.minutes >= 90 or f.prev_minutes >= 90)
    order by abs(coalesce(f.minutes_change_pct, 0)) desc nulls last limit 15
    """
)
if not movers.empty:
    movers.insert(0, "player", [player_url(k, n) for k, n in zip(movers["player_key"], movers["full_name"], strict=True)])
    st.dataframe(
        movers[["player", "team", "competition", "minutes", "prev_minutes", "minutes_change_pct", "starts", "prev_starts", "minutes_share_pct"]],
        width="stretch",
        hide_index=True,
        column_config={
            "player": link_col(),
            "prev_minutes": st.column_config.NumberColumn("prev 28d"),
            "minutes_change_pct": st.column_config.NumberColumn("change", format="%+.0f%%"),
            "prev_starts": st.column_config.NumberColumn("prev starts"),
            "minutes_share_pct": st.column_config.NumberColumn("team-minute share", format="%.0f%%"),
        },
    )
    st.caption("Change compares the last 28 days with the 28 days before. Share of team minutes is capped at 100%.")
