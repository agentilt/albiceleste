{#- Latest roster row per athlete. An athlete can sit on two rosters briefly after a transfer; we
    keep the most recently ingested one as primary. -#}
with r as (
    select *, row_number() over (partition by athlete_id order by as_of desc, team_id) as rn
    from {{ ref('stg_espn__roster_players') }}
)
select
    league, team_id, athlete_id, full_name, name_norm, first_name, last_name, dob, citizenship, citizenship_code,
    birth_country, position_code, position_name, jersey, n_injuries, injury_status, status_type, as_of,
    rn = 1 as is_primary_roster
from r
