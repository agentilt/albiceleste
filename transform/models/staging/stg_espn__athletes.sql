{#- ESPN athlete profiles fetched for players who appear in match summaries but sit on no current roster. -#}
with src as ({{ latest('espn', 'athlete') }})
select
    payload->>'id'                                   as athlete_id,
    payload->>'displayName'                          as full_name,
    {{ norm_name("payload->>'displayName'") }}       as name_norm,
    public.safe_dmy_date(payload->>'displayDOB')     as dob,
    payload->>'citizenship'                          as citizenship,
    payload->'citizenshipCountry'->>'abbreviation'   as citizenship_code,
    payload->'position'->>'displayName'              as position_name,
    payload->'team'->>'displayName'                  as last_known_team_name,
    payload->>'_league'                              as league,
    ingested_at                                      as as_of
from src
