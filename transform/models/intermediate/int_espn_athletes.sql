{#- Every ESPN athlete we know: current roster players (primary) plus profiles of players who appear in
    match history but are on no current roster (moved away, retired, dropped). -#}
with roster as (
    select athlete_id, full_name, name_norm, dob, citizenship, position_name, birth_country, league, team_id, true as in_current_roster
    from {{ ref('int_espn_squad_current') }} where is_primary_roster
),
profiles as (
    select a.athlete_id, a.full_name, a.name_norm, a.dob, a.citizenship, a.position_name, null::text as birth_country, a.league, null::text as team_id, false
    from {{ ref('stg_espn__athletes') }} a
    where not exists (select 1 from roster r where r.athlete_id = a.athlete_id)
)
select * from roster
union all
select * from profiles
