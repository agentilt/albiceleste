{#- Rolling windows (28/56/84 days) per player, with the immediately preceding window of equal length
    for trajectory comparison. Long format: one row per player per window. -#}
with windows as (select unnest(array[28, 56, 84]) as window_days),
f as (select * from {{ ref('fct_player_match_stats') }}),
d as (select player_key, full_name, current_espn_team_id, current_league from {{ ref('dim_player') }}),
m as (select * from {{ ref('fct_match') }} where is_completed),
cur as (
    select d.player_key, w.window_days,
           count(*) filter (where f.played)      as apps,
           count(*) filter (where f.is_starter)  as starts,
           coalesce(sum(f.minutes_played), 0)    as minutes,
           coalesce(sum(f.goals), 0)             as goals,
           coalesce(sum(f.assists), 0)           as assists,
           sum(f.xg)                             as xg,
           sum(f.xa)                             as xa,
           avg(f.match_rating) filter (where f.played) as avg_rating
    from d cross join windows w
    left join f on f.player_key = d.player_key and f.match_date > {{ data_horizon() }} - w.window_days and f.match_date <= {{ data_horizon() }}
    group by 1, 2
),
prev as (
    select d.player_key, w.window_days,
           count(*) filter (where f.played)      as apps,
           count(*) filter (where f.is_starter)  as starts,
           coalesce(sum(f.minutes_played), 0)    as minutes,
           coalesce(sum(f.goals), 0)             as goals,
           coalesce(sum(f.assists), 0)           as assists
    from d cross join windows w
    left join f on f.player_key = d.player_key and f.match_date > {{ data_horizon() }} - 2 * w.window_days and f.match_date <= {{ data_horizon() }} - w.window_days
    group by 1, 2
),
-- denominator: matches played by any team the player appeared for in the last 2×84 days (or his current club)
player_teams as (
    select distinct player_key, espn_team_id from f where match_date > {{ data_horizon() }} - 168 and espn_team_id is not null
    union
    select player_key, current_espn_team_id from d where current_espn_team_id is not null
),
team_matches as (
    select d.player_key, w.window_days,
           count(distinct m.match_key) filter (where m.match_date > {{ data_horizon() }} - w.window_days) as team_matches,
           count(distinct m.match_key) filter (where m.match_date > {{ data_horizon() }} - 2 * w.window_days and m.match_date <= {{ data_horizon() }} - w.window_days) as team_matches_prev
    from d cross join windows w
    join player_teams pt on pt.player_key = d.player_key
    left join m on pt.espn_team_id in (m.home_espn_team_id, m.away_espn_team_id) and m.match_date > {{ data_horizon() }} - 2 * w.window_days
    group by 1, 2
)
select
    c.player_key, d.full_name, d.current_league, c.window_days,
    tm.team_matches, c.apps, c.starts, c.minutes, c.goals, c.assists, c.xg, c.xa, c.avg_rating,
    tm.team_matches_prev, p.apps as prev_apps, p.starts as prev_starts, p.minutes as prev_minutes, p.goals as prev_goals, p.assists as prev_assists,
    case when tm.team_matches > 0 then least(100.0, round(100.0 * c.minutes / (90 * tm.team_matches), 1)) end as minutes_share_pct,
    case when tm.team_matches_prev > 0 then least(100.0, round(100.0 * p.minutes / (90 * tm.team_matches_prev), 1)) end as prev_minutes_share_pct,
    case when p.minutes > 0 then round(100.0 * (c.minutes - p.minutes) / p.minutes, 1) end            as minutes_change_pct,
    c.starts - p.starts                                                                                as starts_change
from cur c
join prev p using (player_key, window_days)
join team_matches tm using (player_key, window_days)
join d using (player_key)
