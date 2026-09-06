import streamlit as st
from lib import page, q

page("Data quality and provenance", "🔍")

st.subheader("Raw layer")
raw = q("select source, entity, count(distinct source_record_id) as records, count(*) as versions, max(ingested_at)::timestamp(0) as last_ingested from raw.records group by 1,2 order by 1,2")
st.dataframe(raw, width="stretch", hide_index=True)

c1, c2 = st.columns(2)
with c1:
    st.subheader("Player-match stats by source")
    st.dataframe(q("select league, stats_source, count(*) as rows, count(distinct player_key) as players from marts.fct_player_match_stats group by 1,2 order by 1,2"), width="stretch", hide_index=True)
with c2:
    st.subheader("Highlightly vs derived ESPN minutes")
    agree = q(
        """
        with h as (select m.match_key, x.athlete_id, s.minutes_played hl_min from staging.stg_highlightly__player_match_stats s
                   join intermediate.int_player_xref_hl x using (hl_player_id) join marts.fct_match m on m.hl_match_id = s.hl_match_id),
             e as (select m.match_key, s.athlete_id, s.minutes_played espn_min from staging.stg_espn__player_match_stats s
                   join marts.fct_match m on m.espn_event_id = s.event_id where s.played)
        select count(*) as pairs, round(100.0*count(*) filter (where abs(hl_min-espn_min)<=3)/nullif(count(*),0)) as pct_within_3_min,
               round(avg(abs(hl_min-espn_min)),2) as mean_abs_diff from h join e using (match_key, athlete_id)
        """
    )
    st.dataframe(agree, width="stretch", hide_index=True)
    st.caption("Same player, same match, both sources present. Validates the substitution-clock derivation of ESPN minutes.")

st.subheader("Coverage")
cov = q(
    """
    select league, count(*) as matches, count(hl_match_id) as with_highlightly_match, count(fd_match_id) as with_fd_match,
           count(*) filter (where exists (select 1 from marts.fct_player_match_stats f where f.match_key = m.match_key and f.stats_source='highlightly')) as with_box_score_rows
    from marts.fct_match m where is_completed group by 1 order by 1
    """
)
st.dataframe(cov, width="stretch", hide_index=True)

st.subheader("Entity-resolution leftovers")
dq = q("select issue, league, subject, subject_id, detail from marts.dq_unmatched order by issue, league, subject")
st.write(f"{len(dq):,} rows")
st.dataframe(dq, width="stretch", hide_index=True)

st.subheader("Recent pipeline runs and Highlightly quota")
runs = q("select started_at::timestamp(0) as started, command, status, records_written, requests_made from meta.pipeline_runs order by started_at desc limit 15")
st.dataframe(runs, width="stretch", hide_index=True)
quota = q("select ratelimit_remaining, called_at::timestamp(0) as as_of from meta.api_calls where source='highlightly' and ratelimit_remaining is not null order by called_at desc limit 1")
if not quota.empty:
    st.metric("Highlightly requests remaining today", int(quota.iloc[0]["ratelimit_remaining"]), help=f"as of {quota.iloc[0]['as_of']}")
