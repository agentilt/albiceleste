with f as (select * from {{ ref('fct_player_match_stats') }}),
d as (select player_key, full_name, current_league, eligibility_status from {{ ref('dim_player') }})
select
    f.player_key,
    d.full_name,
    f.league,
    f.season_year,
    count(*) filter (where f.played)                             as appearances,
    count(*) filter (where f.is_starter)                        as starts,
    count(*) filter (where not f.played)                        as unused_sub_appearances,
    sum(f.minutes_played)                                       as minutes,
    sum(f.goals)                                                as goals,
    sum(f.assists)                                              as assists,
    sum(f.shots)                                                as shots,
    sum(f.shots_on_target)                                      as shots_on_target,
    sum(f.key_passes)                                           as key_passes,
    sum(f.xg)                                                   as xg,
    sum(f.xa)                                                   as xa,
    sum(f.yellow_cards)                                         as yellow_cards,
    sum(f.red_cards)                                            as red_cards,
    avg(f.match_rating) filter (where f.played)                 as avg_rating,
    count(*) filter (where f.stats_source = 'highlightly')      as rows_from_highlightly,
    count(*) filter (where f.stats_source = 'espn')             as rows_from_espn,
    round(90.0 * sum(f.goals)    / nullif(sum(f.minutes_played), 0), 3) as goals_per90,
    round(90.0 * sum(f.assists)  / nullif(sum(f.minutes_played), 0), 3) as assists_per90,
    round(90.0 * sum(f.xg)       / nullif(sum(f.minutes_played), 0), 3) as xg_per90,
    round(90.0 * sum(f.xa)       / nullif(sum(f.minutes_played), 0), 3) as xa_per90,
    min(f.match_date)                                           as first_match_date,
    max(f.match_date)                                           as last_match_date
from f
join d using (player_key)
group by f.player_key, d.full_name, f.league, f.season_year
