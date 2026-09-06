import streamlit as st
from lib import link_col, page, player_url, q

page("Focus set", "🎯")
st.caption("Everyone abroad is in by default. Argentine-league players enter through explicit rules; each row shows why.")

REASONS = ["abroad", "u23_regular", "capped", "top_minutes_position", "rising_starter"]
POS_GROUPS = ["GK", "DEF", "MID", "FWD"]
f1, f2, f3 = st.columns([2, 2, 1])
sel_reason = f1.multiselect("Reason", REASONS, default=[])
pos = f2.multiselect("Position group", POS_GROUPS)
only_home = f3.checkbox("Argentine league only", value=True)

df = q(
    """
    select full_name, age, pos_group, current_team_name as team, current_competition as competition, starts, minutes, goals, assists,
           starts_last5, starts_prev5, minutes_rank_in_position, reasons, player_key
    from marts.player_focus_set
    where in_focus
      and list_has_any(reasons, ?)
      and (list_contains(?, pos_group) or pos_group is null)
      and (not ? or current_league = 'arg.1')
    order by minutes desc nulls last
    """,
    (sel_reason or REASONS, pos or POS_GROUPS, only_home),
)
st.write(f"{len(df):,} players in focus")
if not df.empty:
    df.insert(0, "player", [player_url(k, n) for k, n in zip(df["player_key"], df["full_name"], strict=True)])
    df["reasons"] = df["reasons"].apply(lambda r: ", ".join(r) if isinstance(r, list) else r)
    st.dataframe(
        df[["player", "age", "pos_group", "team", "competition", "starts", "minutes", "goals", "assists", "starts_last5", "starts_prev5", "minutes_rank_in_position", "reasons"]],
        width="stretch",
        hide_index=True,
        height=min(900, 38 * len(df) + 40),
        column_config={
            "player": link_col(),
            "pos_group": "position",
            "starts_last5": st.column_config.NumberColumn("starts, last 5"),
            "starts_prev5": st.column_config.NumberColumn("starts, previous 5"),
            "minutes_rank_in_position": st.column_config.NumberColumn("minutes rank in position"),
        },
    )
    st.caption("Rules: u23_regular = under 23 with regular starts; capped = Argentina senior cap; top_minutes_position = top of his position group by minutes in the league; rising_starter = 3+ starts in the last 5 after at most 1 in the previous 5.")
