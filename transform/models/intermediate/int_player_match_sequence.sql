{#- Each tracked player's matches in order, with the features change detection needs:
    previous team, gap in days, how many of the team's matches were missed in between, running streaks. -#}
with f as (
    select f.*, m.competition_level_rank
    from {{ ref('fct_player_match_stats') }} f
    join {{ ref('fct_match') }} m using (match_key)
),
team_matches as (
    select match_key, kickoff_utc, home_espn_team_id as espn_team_id from {{ ref('fct_match') }} where is_completed
    union all
    select match_key, kickoff_utc, away_espn_team_id from {{ ref('fct_match') }} where is_completed
),
ordered as (
    select
        f.*,
        lag(f.espn_team_id)  over (partition by f.player_key order by f.kickoff_utc) as prev_espn_team_id,
        lag(f.league)        over (partition by f.player_key order by f.kickoff_utc) as prev_league,
        lag(f.competition_level_rank) over (partition by f.player_key order by f.kickoff_utc) as prev_level_rank,
        lag(f.kickoff_utc)   over (partition by f.player_key order by f.kickoff_utc) as prev_kickoff_utc,
        lag(f.kickoff_utc)   over (partition by f.player_key order by f.kickoff_utc rows between unbounded preceding and 1 preceding) as _unused,
        row_number()         over (partition by f.player_key order by f.kickoff_utc) as seq,
        row_number()         over (partition by f.player_key, f.league, f.season_year order by f.kickoff_utc) as seq_in_season
    from f
),
with_gaps as (
    select
        o.*,
        extract(day from o.kickoff_utc - o.prev_kickoff_utc)::int as days_since_prev,
        (select count(*) from team_matches tm
          where tm.espn_team_id = o.espn_team_id
            and tm.kickoff_utc > coalesce(o.prev_kickoff_utc, o.kickoff_utc - interval '1 day')
            and tm.kickoff_utc < o.kickoff_utc) as team_matches_missed_since_prev
    from ordered o
),
-- streak groups: a start streak breaks when the player does not start, or the team played without him
flags as (
    select
        *,
        case when is_starter and coalesce(team_matches_missed_since_prev, 0) = 0 then 0 else 1 end as start_break,
        case when played and coalesce(goals, 0) > 0 then 0 else 1 end                            as scoring_break
    from with_gaps
),
groups as (
    select *,
        sum(start_break)   over (partition by player_key order by kickoff_utc rows unbounded preceding) as start_grp,
        sum(scoring_break) over (partition by player_key order by kickoff_utc rows unbounded preceding) as scoring_grp
    from flags
)
select
    player_match_key, player_key, match_key, league, season_year, match_date, kickoff_utc,
    espn_team_id, prev_espn_team_id, prev_league, competition_level_rank, prev_level_rank,
    is_starter, played, minutes_played, goals, assists, stats_source,
    seq, seq_in_season, days_since_prev, team_matches_missed_since_prev,
    case when is_starter then count(*) over (partition by player_key, start_grp order by kickoff_utc rows unbounded preceding) else 0 end as consecutive_starts,
    case when played and coalesce(goals, 0) > 0 then count(*) over (partition by player_key, scoring_grp order by kickoff_utc rows unbounded preceding) else 0 end as consecutive_scoring_apps,
    sum(case when is_starter then 1 else 0 end) over (partition by player_key, league, season_year order by kickoff_utc rows unbounded preceding) as starts_so_far_season,
    sum(case when played then 1 else 0 end)     over (partition by player_key, league order by kickoff_utc rows unbounded preceding) as apps_so_far_league
from groups
