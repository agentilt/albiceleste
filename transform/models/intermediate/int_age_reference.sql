{#- What pool players did at each age: quantiles of the activity index (minutes share × competition weight) over every
    scored observation, grouped by the player's age on that date. The reference band for the Next cycle chart. -#}
select age,
       count(*)                                                     as observations,
       count(distinct player_key)                                   as players,
       percentile_cont(0.25) within group (order by activity_index) as p25,
       percentile_cont(0.50) within group (order by activity_index) as p50,
       percentile_cont(0.75) within group (order by activity_index) as p75,
       percentile_cont(0.90) within group (order by activity_index) as p90
from {{ ref('int_age_observations') }}
where age between 16 and 40
group by 1
order by 1
