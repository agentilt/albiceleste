import pandas as pd
import streamlit as st
from lib import fmt_int, line, page, q, timeline

page("Player", "👤")

players = q(
    """
    select player_key, full_name, coalesce(current_team_name, '—') as team, current_competition
    from marts.dim_player
    where in_tracked_squad or (eligibility_status = 'eligible' and identity_source = 'wikidata' and has_arg_senior_cap)
    order by in_tracked_squad desc, full_name
    """
)
labels = {r.player_key: f"{r.full_name} · {r.team}" for r in players.itertuples()}
default_key = st.query_params.get("player_key")
keys = list(labels.keys())
idx = keys.index(default_key) if default_key in labels else 0
key = st.selectbox("Player", keys, index=idx, format_func=lambda k: labels[k], help="Type to search")
st.query_params["player_key"] = key

d = q("select * from marts.dim_player where player_key = ?", (key,))
if d.empty:
    st.stop()
p = d.iloc[0]

st.header(p["full_name"])
mv_text = f"€{p['market_value_eur'] / 1e6:.1f}m" if pd.notna(p["market_value_eur"]) else "no market value"
st.markdown(
    f"**{p['current_team_name'] or 'no current club in tracked leagues'}** · {p['current_competition'] or '–'} · "
    f"{p['primary_position'] or 'position unknown'} · age {fmt_int(p['age'])} · {p['eligibility_status']} · {mv_text}"
)
flags = []
if p["has_arg_senior_cap"]:
    flags.append("Argentina senior international")
if p["has_arg_youth_cap"]:
    flags.append("Argentina youth international")
if p["has_other_senior_cap"]:
    flags.append(f"⚠ senior spell for another nation: {p['other_senior_teams']}")
if p["is_injured"]:
    flags.append(f"injury listed: {p['injury_status']}")
if flags:
    st.write(" · ".join(flags))

tab1, tab2, tab3, tab4 = st.tabs(["Current season", "Trajectory", "Career", "Sources"])

with tab1:
    season = q(
        "select league, season_year, appearances, starts, minutes, goals, assists, xg, xa, avg_rating, goals_per90, xg_per90, rows_from_highlightly, rows_from_espn "
        "from marts.player_season_stats where player_key = ? order by season_year desc, minutes desc",
        (key,),
    )
    st.dataframe(season, width="stretch", hide_index=True)
    matches = q(
        """
        select f.match_date, m.home_team_name || ' ' || coalesce(m.home_score::text,'') || '–' || coalesce(m.away_score::text,'') || ' ' || m.away_team_name as match,
               f.is_starter, f.minutes_played, f.goals, f.assists, f.xg, f.xa, f.match_rating, f.stats_source
        from marts.fct_player_match_stats f join marts.fct_match m using (match_key)
        where f.player_key = ? order by f.match_date desc limit 40
        """,
        (key,),
    )
    if not matches.empty:
        chron = matches.sort_values("match_date").copy()
        chron["rolling_minutes"] = chron["minutes_played"].rolling(5, min_periods=1).mean()
        timeline(chron, "match_date", "minutes_played", "Minutes per match", "minutes", rolling="rolling_minutes")
        st.dataframe(matches, width="stretch", hide_index=True)
    else:
        st.caption("No match rows in the tracked competitions.")

with tab2:
    form = q(
        "select window_days, team_matches, apps, starts, minutes, minutes_share_pct, prev_minutes, prev_minutes_share_pct, minutes_change_pct, starts_change, goals, assists, xg, xa "
        "from marts.player_recent_form where player_key = ? order by window_days",
        (key,),
    )
    st.subheader("Rolling windows vs the preceding window")
    st.dataframe(form, width="stretch", hide_index=True)
    ev = q("select event_date, severity, event_type, headline from marts.player_events where player_key = ? order by event_date desc, severity desc", (key,))
    st.subheader("Events")
    st.dataframe(ev, width="stretch", hide_index=True)

with tab3:
    hist = q(
        "select season, competition_name, club_name, appearances, minutes, goals, assists from marts.player_season_history where player_key = ? order by season desc, minutes desc",
        (key,),
    )
    st.subheader("Seasons (Transfermarkt, to June 2026)")
    st.dataframe(hist, width="stretch", hide_index=True)
    moves = q(
        "select transfer_date, from_club_name, to_club_name, to_competition, to_country, transfer_fee_eur, market_value_eur, age_at_transfer "
        "from marts.player_career_history where player_key = ? order by transfer_date",
        (key,),
    )
    st.subheader("Transfers")
    st.dataframe(moves, width="stretch", hide_index=True)
    mv = q("select valuation_date, market_value_eur from marts.player_market_values where player_key = ? order by 1", (key,))
    if not mv.empty:
        mv["market_value_m"] = mv["market_value_eur"] / 1e6
        line(mv, "valuation_date", "market_value_m", "Market value (€m)", "€m", fmt=".0f")

with tab4:
    ids = q("select source, source_id from marts.player_source_ids where player_key = ? order by source", (key,))
    st.dataframe(ids, width="stretch", hide_index=True)
    st.caption(f"Identity source: {p['identity_source']} · eligibility basis: {p['eligibility_basis']} · squad snapshot: {str(p['squad_as_of'])[:10]}")
