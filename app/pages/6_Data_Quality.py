import streamlit as st
from lib import manifest, page, q

page("Data quality and provenance", "🔍")
m = manifest()
st.caption(f"Snapshot exported {str(m['exported_at'])[:16].replace('T', ' ')} UTC from commit {m.get('git_commit') or '?'}; matches through {m['data_as_of']}.")

st.subheader("Raw layer")
st.caption("Every API response is stored as a versioned JSON record; unchanged payloads are not re-written.")
st.dataframe(q("select source, entity, records, versions, last_ingested from meta.raw_summary order by 1, 2"), width="stretch", hide_index=True)

c1, c2 = st.columns(2)
with c1:
    st.subheader("Player-match stats by source")
    st.dataframe(q("select league, stats_source, count(*) as rows, count(distinct player_key) as players from marts.fct_player_match_stats group by 1, 2 order by 1, 2"), width="stretch", hide_index=True)
with c2:
    st.subheader("Highlightly vs derived ESPN minutes")
    st.dataframe(q("select pairs, pct_within_3_min, mean_abs_diff, max_abs_diff from marts.dq_minutes_agreement"), width="stretch", hide_index=True)
    st.caption("Same player, same match, both sources present. Validates the substitution-clock derivation of ESPN minutes.")

st.subheader("Coverage")
cov = q(
    """
    select m.league, count(*) as matches, count(m.hl_match_id) as with_highlightly_match, count(m.fd_match_id) as with_fd_match,
           count(*) filter (where exists (select 1 from marts.fct_player_match_stats f where f.match_key = m.match_key and f.stats_source = 'highlightly')) as with_box_score_rows
    from marts.fct_match m where m.is_completed group by 1 order by 1
    """
)
st.dataframe(cov, width="stretch", hide_index=True)

st.subheader("Entity-resolution leftovers")
dq = q("select issue, league, subject, subject_id, detail from marts.dq_unmatched order by issue, league, subject")
st.write(f"{len(dq):,} rows")
st.dataframe(dq, width="stretch", hide_index=True)

st.subheader("Recent pipeline runs and Highlightly quota")
runs = q("select started_at, command, status, records_written, requests_made from meta.pipeline_runs order by started_at desc limit 15")
st.dataframe(runs, width="stretch", hide_index=True, column_config={"started_at": st.column_config.DatetimeColumn("started", format="YYYY-MM-DD HH:mm")})
quota = q("select ratelimit_remaining, called_at from meta.highlightly_quota")
if not quota.empty:
    st.metric("Highlightly requests remaining at export time", int(quota.iloc[0]["ratelimit_remaining"]), help=f"as of {str(quota.iloc[0]['called_at'])[:16]}")

st.subheader("Published tables")
tables = [{"table": k, "rows": v["rows"], "KB": round(v["bytes"] / 1024)} for k, v in m["tables"].items()]
st.dataframe(tables, width="stretch", hide_index=True)
