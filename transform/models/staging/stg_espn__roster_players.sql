with src as ({{ latest('espn', 'roster') }})
select
    payload->>'_league'                                   as league,
    payload->>'_team_id'                                  as team_id,
    a->>'id'                                              as athlete_id,
    a->>'displayName'                                     as full_name,
    {{ norm_name("a->>'displayName'") }}                  as name_norm,
    a->>'firstName'                                       as first_name,
    a->>'lastName'                                        as last_name,
    nullif(a->>'dateOfBirth', '')::timestamptz::date      as dob,
    a->>'citizenship'                                     as citizenship,
    a->'citizenshipCountry'->>'abbreviation'              as citizenship_code,
    a->'birthPlace'->>'country'                           as birth_country,
    a->'position'->>'abbreviation'                        as position_code,
    a->'position'->>'displayName'                         as position_name,
    a->>'jersey'                                          as jersey,
    jsonb_array_length(coalesce(a->'injuries', '[]'))     as n_injuries,
    a->'injuries'->0->>'status'                           as injury_status,
    a->'status'->>'type'                                  as status_type,
    ingested_at                                           as as_of
from src, jsonb_array_elements(payload->'athletes') a
