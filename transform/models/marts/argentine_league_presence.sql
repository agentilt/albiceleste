with d as (select * from {{ ref('dim_player') }} where in_tracked_squad and eligibility_status in ('eligible', 'review'))
select
    current_league          as league,
    current_competition     as competition,
    current_country         as country,
    count(*)                as players,
    count(*) filter (where age < 23)            as players_u23,
    count(*) filter (where has_arg_senior_cap)  as senior_internationals,
    count(*) filter (where eligibility_status = 'review') as under_review,
    count(distinct current_team_key)            as clubs_with_argentines
from d
group by 1, 2, 3
order by players desc
