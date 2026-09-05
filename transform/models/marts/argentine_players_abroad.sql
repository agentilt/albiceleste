with d as (select * from {{ ref('dim_player') }}),
s as (select * from {{ ref('player_season_stats') }}),
cur_season as (
    select s.*, row_number() over (partition by player_key order by season_year desc, last_match_date desc) rn from s
)
select
    d.player_key, d.full_name, d.dob, d.age, d.primary_position, d.eligibility_status, d.eligibility_basis,
    d.has_arg_senior_cap, d.has_arg_youth_cap, d.has_other_senior_cap,
    d.current_team_name, d.current_league, d.current_competition, d.current_country, d.current_competition_level_rank,
    d.is_injured, d.injury_status,
    cs.season_year, cs.appearances, cs.starts, cs.minutes, cs.goals, cs.assists, cs.xg, cs.xa, cs.avg_rating,
    cs.goals_per90, cs.assists_per90, cs.last_match_date
from d
left join cur_season cs on cs.player_key = d.player_key and cs.rn = 1 and cs.league = d.current_league
where d.is_abroad and d.eligibility_status in ('eligible', 'review')
