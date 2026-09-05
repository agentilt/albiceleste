with src as ({{ latest('fd', 'team') }})
select
    payload->>'_competition'                    as fd_code,
    (payload->>'id')::int                       as fd_team_id,
    payload->>'name'                            as team_name,
    (s->>'id')::int                             as fd_person_id,
    s->>'name'                                  as full_name,
    {{ norm_name("s->>'name'") }}               as name_norm,
    s->>'position'                              as position_name,
    nullif(s->>'dateOfBirth', '')::date         as dob,
    s->>'nationality'                           as nationality,
    ingested_at                                 as as_of
from src, jsonb_array_elements(coalesce(payload->'squad', '[]')) s
