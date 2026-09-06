import streamlit as st
from lib import page, player_link, q

page("Focus set", "🎯")
st.caption("Everyone abroad is in by default. Argentine-league players enter through explicit rules; each row shows why.")

reasons = ["abroad", "u23_regular", "capped", "top_minutes_position", "rising_starter"]
f1, f2, f3 = st.columns([2, 2, 1])
sel_reason = f1.multiselect("Reason", reasons, default=[])
pos = f2.multiselect("Position group", ["GK", "DEF", "MID", "FWD"])
only_home = f3.checkbox("Argentine league only", value=True)

df = q(
    """
    select full_name, age, pos_group, current_team_name as team, current_competition as competition, starts, minutes, goals, assists,
           starts_last5, starts_prev5, minutes_rank_in_position, reasons, player_key
    from marts.player_focus_set
    where in_focus
      and (%s = '{}' or reasons && %s::text[])
      and (%s = '{}' or pos_group = any(%s))
      and (not %s or current_league = 'arg.1')
    order by minutes desc nulls last
    """,
    (sel_reason, sel_reason, pos, pos, only_home),
)
st.write(f"{len(df):,} players in focus")
if not df.empty:
    df["player"] = [player_link(k, n) for k, n in zip(df["player_key"], df["full_name"], strict=True)]
    df["reasons"] = df["reasons"].apply(lambda r: ", ".join(r) if isinstance(r, list) else r)
    st.markdown(df[["player", "age", "pos_group", "team", "competition", "starts", "minutes", "goals", "assists", "starts_last5", "starts_prev5", "minutes_rank_in_position", "reasons"]].to_markdown(index=False))
