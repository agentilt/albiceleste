import streamlit as st
from lib import hbar, line, page, q

page("Presence and the export pipeline", "🧭")

st.subheader("Where eligible players are today")
pres = q("select competition, country, players, players_u23, senior_internationals, under_review, clubs_with_argentines from marts.argentine_league_presence order by players desc")
st.dataframe(pres, width="stretch", hide_index=True)

st.subheader("First move abroad from an Argentine club (Transfermarkt, all Argentines in the snapshot)")
yr_from = st.slider("From year", 2000, 2026, 2016)
dest = q(
    "select to_country, sum(players_exported) as players_exported from marts.argentine_export_summary where transfer_year >= %s group by 1 order by 2 desc limit 12",
    (yr_from,),
)
c1, c2 = st.columns(2)
with c1:
    hbar(dest, "to_country", "players_exported", f"Destination countries since {yr_from}")
with c2:
    per_year = q(
        "select make_date(transfer_year, 1, 1) as year, sum(players_exported) as players_exported, round(avg(avg_age_at_export),1) as avg_age from marts.argentine_export_summary where transfer_year >= %s group by 1 order by 1",
        (yr_from,),
    )
    line(per_year, "year", "players_exported", "Players exported per year", "players")

st.subheader("Exporting clubs")
clubs = q("select from_club_name as club, players_exported, exported_last_10y, to_europe, avg_age_at_export, total_fees_eur from marts.argentine_exporting_clubs limit 25")
st.dataframe(clubs, width="stretch", hide_index=True)
st.caption("'other / not covered' means the destination league is outside the 65 competitions in the snapshot.")
