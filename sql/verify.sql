-- Headline sanity checks after a load + dbt run. Usage: make verify
\echo == raw layer ==
SELECT source, entity, count(DISTINCT source_record_id) AS records, count(*) AS versions
FROM raw.records GROUP BY 1,2 ORDER BY 1,2;

\echo == population by eligibility and identity source ==
SELECT eligibility_status, identity_source, count(*) FROM marts.dim_player GROUP BY 1,2 ORDER BY 1,2;

\echo == presence by league ==
SELECT * FROM marts.argentine_league_presence;

\echo == crosswalk coverage: ESPN Argentine squad players resolved to Wikidata ==
SELECT s.league, count(*) AS espn_argentines, count(x.wikidata_qid) AS matched, round(100.0*count(x.wikidata_qid)/count(*)) AS pct
FROM intermediate.int_espn_squad_current s LEFT JOIN intermediate.int_player_xref_espn x USING (athlete_id)
WHERE s.citizenship='Argentina' AND s.is_primary_roster GROUP BY 1 ORDER BY 1;

\echo == team / match crosswalks ==
SELECT league, count(*) AS espn_teams, count(hl_team_id) AS with_highlightly, count(fd_team_id) AS with_fd FROM intermediate.int_team_xref GROUP BY 1 ORDER BY 1;
SELECT league, count(*) AS espn_matches, count(hl_match_id) AS with_highlightly, count(fd_match_id) AS with_fd
FROM marts.fct_match GROUP BY 1 ORDER BY 1;

\echo == player-match stats by source ==
SELECT league, stats_source, count(*) AS rows, count(DISTINCT player_key) AS players, sum(minutes_played) AS minutes
FROM marts.fct_player_match_stats GROUP BY 1,2 ORDER BY 1,2;

\echo == Highlightly vs ESPN minutes agreement where both exist (same player, same match) ==
WITH h AS (SELECT m.match_key, p.player_key, s.minutes_played hl_min
           FROM staging.stg_highlightly__player_match_stats s
           JOIN marts.dim_player p ON p.hl_player_id = s.hl_player_id
           JOIN marts.fct_match m ON m.hl_match_id = s.hl_match_id),
     e AS (SELECT m.match_key, p.player_key, s.minutes_played espn_min
           FROM staging.stg_espn__player_match_stats s
           JOIN marts.dim_player p ON p.espn_athlete_id = s.athlete_id
           JOIN marts.fct_match m ON m.espn_event_id = s.event_id WHERE s.played)
SELECT count(*) AS pairs,
       round(100.0 * count(*) FILTER (WHERE abs(hl_min - espn_min) <= 3) / nullif(count(*),0)) AS pct_within_3_min,
       round(avg(abs(hl_min - espn_min)),1) AS mean_abs_diff
FROM h JOIN e USING (match_key, player_key);

\echo == data-quality leftovers ==
SELECT issue, count(*) FROM marts.dq_unmatched GROUP BY 1 ORDER BY 2 DESC;

\echo == highlightly quota ==
SELECT ratelimit_remaining, called_at::timestamp(0) FROM meta.api_calls WHERE source='highlightly' AND ratelimit_remaining IS NOT NULL ORDER BY called_at DESC LIMIT 1;
