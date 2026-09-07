{#- Every scored (player, date) observation with the player's age on that date and his activity index: the population
    behind int_age_reference and the age percentiles on player_trajectory. -#}
select s.player_key, s.as_of, floor((s.as_of - d.dob) / 365.25)::int as age, s.minutes_share * s.competition as activity_index
from {{ ref('int_player_score') }} s
join {{ ref('dim_player') }} d using (player_key)
where s.score is not null and s.team_matches >= 5 and d.dob is not null
