import streamlit as st
from lib import hbar, page, player_link, q

page("Argentine players abroad", "🌍")
st.caption("Eligible or under-review players whose current club is outside Argentina, with their current-season line.")

opts = q("select distinct current_competition, current_country from marts.argentine_players_abroad order by 2, 1")
f1, f2, f3, f4, f5 = st.columns([2, 2, 1, 1, 1])
comp = f1.multiselect("Competition", opts["current_competition"].dropna().tolist())
pos = f2.multiselect("Position", ["Goalkeeper", "Defender", "Midfielder", "Forward"])
age_max = f3.slider("Max age", 16, 40, 40)
min_minutes = f4.number_input("Min minutes", 0, 5000, 0, step=90)
status = f5.multiselect("Eligibility", ["eligible", "review"], default=["eligible", "review"])

df = q(
    """
    select full_name, age, primary_position, current_team_name as team, current_competition as competition, current_country as country,
           appearances, starts, minutes, goals, assists, xg, xa, avg_rating, eligibility_status, has_arg_senior_cap, is_injured, player_key
    from marts.argentine_players_abroad
    where (%s = '{}' or current_competition = any(%s))
      and (%s = '{}' or primary_position = any(%s))
      and coalesce(age, 0) <= %s and coalesce(minutes, 0) >= %s
      and eligibility_status = any(%s)
    order by minutes desc nulls last, full_name
    """,
    (comp, comp, pos, pos, age_max, min_minutes, status or ["eligible", "review"]),
)
st.write(f"{len(df):,} players")
if not df.empty:
    top = df.dropna(subset=["minutes"]).head(15)[["full_name", "minutes"]]
    hbar(top, "full_name", "minutes", "Most minutes this season (filtered)")
    df["player"] = [player_link(k, n) for k, n in zip(df["player_key"], df["full_name"], strict=True)]
    show = df[["player", "age", "primary_position", "team", "competition", "appearances", "starts", "minutes", "goals", "assists", "xg", "xa", "avg_rating", "eligibility_status", "has_arg_senior_cap", "is_injured"]]
    st.markdown(show.rename(columns={"primary_position": "position", "has_arg_senior_cap": "senior cap", "is_injured": "injured"}).to_markdown(index=False))
