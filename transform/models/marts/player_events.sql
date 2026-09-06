{#- Detected events, one row each, with the evidence that produced them. Facts are computed here;
    the `headline` is a plain template so a later language layer has nothing to invent.
    Match-based events carry the match date; window-based events (minutes surge/drop) are as of today. -#}
with seqm as (select * from {{ ref('int_player_match_sequence') }}),
d as (select player_key, full_name, current_team_name, current_league from {{ ref('dim_player') }}),
teams as (select league, espn_team_id, team_name from {{ ref('dim_team') }}),
form as (select * from {{ ref('player_recent_form') }} where window_days = 28),
data_start as (select min(match_date) as first_date from {{ ref('fct_match') }}),

match_events as (
    -- club change (first match for a new team), with competition level comparison
    select s.player_key, 'club_change' as event_type, s.match_date as event_date, s.match_key, s.league,
           case when s.prev_level_rank is null or s.competition_level_rank = s.prev_level_rank then 2 else 3 end as severity,
           jsonb_build_object('from_team', pt.team_name, 'to_team', ct.team_name, 'from_league', s.prev_league, 'to_league', s.league,
                              'from_level_rank', s.prev_level_rank, 'to_level_rank', s.competition_level_rank) as evidence,
           format('%s: first match for %s (%s) after %s (%s)%s', d.full_name, coalesce(ct.team_name, s.espn_team_id), s.league,
                  coalesce(pt.team_name, s.prev_espn_team_id), s.prev_league,
                  case when s.competition_level_rank < s.prev_level_rank then ' — stronger competition'
                       when s.competition_level_rank > s.prev_level_rank then ' — weaker competition' else '' end) as headline
    from seqm s
    join d using (player_key)
    left join teams ct on ct.league = s.league and ct.espn_team_id = s.espn_team_id
    left join teams pt on pt.league = s.prev_league and pt.espn_team_id = s.prev_espn_team_id
    where s.prev_espn_team_id is not null and s.espn_team_id <> s.prev_espn_team_id

    union all
    -- first start of the season in a league
    select s.player_key, 'first_start_of_season', s.match_date, s.match_key, s.league, 1,
           jsonb_build_object('season_year', s.season_year, 'apps_before_first_start', s.seq_in_season - 1),
           format('%s: first start of the %s season for %s', d.full_name, s.season_year, coalesce(ct.team_name, s.espn_team_id))
    from seqm s join d using (player_key)
    left join teams ct on ct.league = s.league and ct.espn_team_id = s.espn_team_id
    where s.is_starter and s.starts_so_far_season = 1

    union all
    -- start streaks reaching 3, 5, 10
    select s.player_key, 'consecutive_starts', s.match_date, s.match_key, s.league,
           case s.consecutive_starts when 3 then 1 when 5 then 2 else 3 end,
           jsonb_build_object('consecutive_starts', s.consecutive_starts),
           format('%s: %s consecutive starts for %s', d.full_name, s.consecutive_starts, coalesce(ct.team_name, s.espn_team_id))
    from seqm s join d using (player_key)
    left join teams ct on ct.league = s.league and ct.espn_team_id = s.espn_team_id
    where s.consecutive_starts in (3, 5, 10)

    union all
    -- scoring streaks reaching 3 and 5 consecutive appearances with a goal
    select s.player_key, 'scoring_streak', s.match_date, s.match_key, s.league,
           case s.consecutive_scoring_apps when 3 then 2 else 3 end,
           jsonb_build_object('consecutive_scoring_apps', s.consecutive_scoring_apps),
           format('%s: scored in %s consecutive appearances', d.full_name, s.consecutive_scoring_apps)
    from seqm s join d using (player_key)
    where s.consecutive_scoring_apps in (3, 5)

    union all
    -- two or more goals in a match
    select s.player_key, 'multi_goal_match', s.match_date, s.match_key, s.league,
           case when s.goals >= 3 then 3 else 2 end,
           jsonb_build_object('goals', s.goals, 'minutes', s.minutes_played),
           format('%s: %s goals in one match for %s', d.full_name, s.goals, coalesce(ct.team_name, s.espn_team_id))
    from seqm s join d using (player_key)
    left join teams ct on ct.league = s.league and ct.espn_team_id = s.espn_team_id
    where s.goals >= 2

    union all
    -- return after a long absence while the team kept playing (injury / exclusion proxy)
    select s.player_key, 'return_after_absence', s.match_date, s.match_key, s.league, 2,
           jsonb_build_object('days_absent', s.days_since_prev, 'team_matches_missed', s.team_matches_missed_since_prev),
           format('%s: back in the squad after %s days and %s team matches missed', d.full_name, s.days_since_prev, s.team_matches_missed_since_prev)
    from seqm s join d using (player_key)
    where s.played and s.days_since_prev >= 60 and s.team_matches_missed_since_prev >= 5

    union all
    -- first appearance in a league within our data (caveat: data horizon)
    select s.player_key, 'debut_in_league', s.match_date, s.match_key, s.league, 2,
           jsonb_build_object('data_starts', (select first_date from data_start), 'minutes', s.minutes_played, 'started', s.is_starter),
           format('%s: first %s appearance in our data (%s)', d.full_name, s.league, coalesce(ct.team_name, s.espn_team_id))
    from seqm s join d using (player_key)
    left join teams ct on ct.league = s.league and ct.espn_team_id = s.espn_team_id
    where s.played and s.apps_so_far_league = 1
      and s.match_date > (select first_date from data_start) + interval '45 days'
),
window_events as (
    select f.player_key, 'minutes_surge' as event_type, {{ data_horizon() }} as event_date, null::text as match_key, f.current_league as league,
           case when f.minutes_change_pct >= 100 then 3 else 2 end as severity,
           jsonb_build_object('window_days', 28, 'minutes', f.minutes, 'prev_minutes', f.prev_minutes, 'change_pct', f.minutes_change_pct,
                              'starts', f.starts, 'prev_starts', f.prev_starts, 'minutes_share_pct', f.minutes_share_pct) as evidence,
           format('%s: %s minutes in the last 28 days vs %s before (+%s%%), starts %s vs %s', f.full_name, f.minutes, f.prev_minutes, f.minutes_change_pct, f.starts, f.prev_starts) as headline
    from form f
    where f.minutes >= 180 and f.prev_minutes >= 45 and f.minutes_change_pct >= 50

    union all
    select f.player_key, 'minutes_drop', {{ data_horizon() }}, null, f.current_league,
           case when f.minutes_change_pct <= -75 then 3 else 2 end,
           jsonb_build_object('window_days', 28, 'minutes', f.minutes, 'prev_minutes', f.prev_minutes, 'change_pct', f.minutes_change_pct,
                              'starts', f.starts, 'prev_starts', f.prev_starts, 'team_matches', f.team_matches),
           format('%s: %s minutes in the last 28 days vs %s before (%s%%), starts %s vs %s', f.full_name, f.minutes, f.prev_minutes, f.minutes_change_pct, f.starts, f.prev_starts)
    from form f
    where f.prev_minutes >= 180 and f.team_matches >= 3 and f.minutes_change_pct <= -50
),
club_changes as (
    select e.*,
           lag(e.evidence->>'from_team') over (partition by e.player_key order by e.event_date) as prev_from_team,
           lag(e.event_date)             over (partition by e.player_key order by e.event_date) as prev_change_date,
           lead(e.evidence->>'to_team')  over (partition by e.player_key order by e.event_date) as next_to_team,
           lead(e.event_date)            over (partition by e.player_key order by e.event_date) as next_change_date
    from match_events e where e.event_type = 'club_change'
),
-- a move that is immediately reversed (A→B then B→A within 30 days) is almost always one ESPN id shared by two people
pingpong as (
    select event_key_parts.* from (
        select player_key, event_date, match_key from club_changes
        where (next_to_team = evidence->>'from_team' and next_change_date - event_date <= 30)
           or (prev_from_team = evidence->>'to_team' and event_date - prev_change_date <= 30)
    ) event_key_parts
),
all_events as (
    select m.* from match_events m
    where not (m.event_type = 'club_change'
               and exists (select 1 from pingpong p where p.player_key = m.player_key and p.match_key = m.match_key))
    union all
    select * from window_events
)
select
    md5(player_key || '|' || event_type || '|' || event_date::text || '|' || coalesce(match_key, '')) as event_key,
    player_key, event_type, event_date, match_key, league, severity, evidence, headline,
    current_date as detected_as_of
from all_events
