import streamlit as st
from lib import hbar, link_col, page, player_url, q

page("Argentine players abroad", "🌍")
st.caption("Eligible or under-review players whose current club is outside Argentina, with their current-season line.")

opts = q("select distinct current_competition, current_country from marts.argentine_players_abroad where current_competition is not null order by 2, 1")
POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"]
f1, f2, f3, f4, f5 = st.columns([2, 2, 1, 1, 1.4])
comp = f1.multiselect("Competition", opts["current_competition"].tolist())
pos = f2.multiselect("Position", POSITIONS)
age_max = f3.slider("Max age", 16, 40, 40)
min_minutes = f4.number_input("Min minutes", 0, 5000, 0, step=90)
status = f5.multiselect("Eligibility", ["eligible", "review"], default=["eligible", "review"])

df = q(
    """
    select full_name, age, primary_position, current_team_name as team, current_competition as competition, current_country as country,
           appearances, starts, minutes, goals, assists, xg, xa, avg_rating, eligibility_status, has_arg_senior_cap, is_injured, player_key
    from marts.argentine_players_abroad
    where list_contains(?, current_competition)
      and (list_contains(?, primary_position) or primary_position is null)
      and coalesce(age, 0) <= ? and coalesce(minutes, 0) >= ?
      and list_contains(?, eligibility_status)
    order by minutes desc nulls last, full_name
    """,
    (comp or opts["current_competition"].tolist(), pos or POSITIONS, age_max, min_minutes, status or ["eligible", "review"]),
)
st.write(f"{len(df):,} players")
if not df.empty:
    top = df.dropna(subset=["minutes"]).head(15)[["full_name", "minutes"]]
    hbar(top, "full_name", "minutes", "Most minutes this season (filtered)")
    df.insert(0, "player", [player_url(k, n) for k, n in zip(df["player_key"], df["full_name"], strict=True)])
    st.dataframe(
        df[["player", "age", "primary_position", "team", "competition", "appearances", "starts", "minutes", "goals", "assists", "xg", "xa", "avg_rating", "eligibility_status", "has_arg_senior_cap", "is_injured"]],
        width="stretch",
        hide_index=True,
        height=min(900, 38 * len(df) + 40),
        column_config={
            "player": link_col(),
            "primary_position": "position",
            "xg": st.column_config.NumberColumn("xG", format="%.2f"),
            "xa": st.column_config.NumberColumn("xA", format="%.2f"),
            "avg_rating": st.column_config.NumberColumn("rating", format="%.2f"),
            "eligibility_status": "eligibility",
            "has_arg_senior_cap": st.column_config.CheckboxColumn("senior cap"),
            "is_injured": st.column_config.CheckboxColumn("injured"),
        },
    )
    st.caption("xG, xA and rating come from Highlightly box scores where available; minutes, goals and assists fall back to ESPN.")
