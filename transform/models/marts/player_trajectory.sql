{#- The Next cycle cohort: eligible players aged 23 or under in a tracked squad, with the trajectory metric and its parts.
    trajectory = activity index now (minutes share × competition weight over the current spell's last ten team matches)
    divided by the 75th percentile of that index among pool players at the same age (int_age_reference). 1.0 means he is on
    the bar set by the top quarter of pool players at his age; most squad youngsters sit at zero, which is why the median is
    not the bar. Age alone never decides the order. -#}
with h as (select {{ data_horizon() }} as horizon),
d as (
    select d.*, {{ pos_group('d.primary_position') }} as pos_group
    from {{ ref('dim_player') }} d, h
    where d.in_tracked_squad and d.eligibility_status in ('eligible', 'review')
      and d.dob is not null and floor((h.horizon - d.dob) / 365.25) <= 23
),
now_ as (
    select s.player_key, s.minutes_share * s.competition as activity_index, s.minutes_share, s.competition, s.level_rank, s.team_matches, s.score, s.pos_rank
    from {{ ref('player_rank_history') }} s where s.is_horizon
),
year_ago as (
    select distinct on (s.player_key) s.player_key, s.minutes_share * s.competition as activity_index_year_ago, s.level_rank as level_rank_year_ago
    from {{ ref('int_player_score') }} s, h
    where s.score is not null and s.as_of <= h.horizon - 364
    order by s.player_key, s.as_of desc
),
season_now as (
    select f.player_key, sum(f.minutes_played) as minutes_this_season, count(*) filter (where f.played) as apps_this_season
    from {{ ref('fct_player_match_stats') }} f
    join (select league, max(season_year) as season_year from {{ ref('fct_match') }} group by 1) cur using (league, season_year)
    group by 1
),
season_prev as (
    select f.player_key, sum(f.minutes_played) as minutes_last_season
    from {{ ref('fct_player_match_stats') }} f
    join (select league, max(season_year) - 1 as season_year from {{ ref('fct_match') }} group by 1) prev using (league, season_year)
    group by 1
),
first_senior as (
    select player_key, min(season) as first_senior_season
    from {{ ref('player_season_history') }} where coalesce(appearances, 0) > 0 group by 1
),
first_abroad as (
    select distinct on (player_key) player_key, transfer_date as first_abroad_date, to_country as first_abroad_country, to_competition as first_abroad_competition, age_at_transfer as first_abroad_age
    from {{ ref('player_career_history') }}
    where from_country = 'Argentina' and to_country is not null and to_country <> 'Argentina'
    order by player_key, transfer_date
),
ref as (select * from {{ ref('int_age_reference') }})
select
    d.player_key, d.full_name, d.dob,
    floor((h.horizon - d.dob) / 365.25)::int                       as age,
    d.pos_group, d.primary_position, d.current_team_name, d.current_league, d.current_competition, d.current_country, d.is_abroad,
    d.has_arg_youth_cap, d.has_arg_senior_cap, d.has_other_senior_cap, d.citizenships,
    (array_length(d.citizenships, 1) > 1 and not coalesce(d.has_arg_senior_cap, false) and not coalesce(d.has_other_senior_cap, false)) as dual_national_untied,
    n.activity_index, n.minutes_share, n.competition, n.level_rank, n.team_matches, n.score, n.pos_rank,
    y.activity_index_year_ago, y.level_rank_year_ago,
    sn.minutes_this_season, sn.apps_this_season, sp.minutes_last_season,
    r.p25 as age_p25, r.p50 as age_p50, r.p75 as age_p75, r.p90 as age_p90, r.players as age_reference_players,
    -- trajectory: the player's activity index against the top quarter of pool players at his age (1.0 = on that bar)
    case when n.activity_index is not null and r.p75 is not null then round((n.activity_index / greatest(r.p75, 0.10))::numeric, 2) end as trajectory,
    -- share of same-age observations in the pool history at or below the player's index
    case when n.activity_index is not null then
        (select round(100.0 * count(*) filter (where o.activity_index <= n.activity_index) / nullif(count(*), 0), 0)
           from {{ ref('int_age_observations') }} o where o.age = floor((h.horizon - d.dob) / 365.25)::int)
    end as age_percentile,
    fs.first_senior_season,
    case when fs.first_senior_season is not null then fs.first_senior_season - extract(year from d.dob)::int end as first_senior_age_approx,
    fa.first_abroad_date, fa.first_abroad_country, fa.first_abroad_competition, fa.first_abroad_age
from d
cross join h
left join now_ n using (player_key)
left join year_ago y using (player_key)
left join season_now sn using (player_key)
left join season_prev sp using (player_key)
left join first_senior fs using (player_key)
left join first_abroad fa using (player_key)
left join ref r on r.age = floor((h.horizon - d.dob) / 365.25)::int
