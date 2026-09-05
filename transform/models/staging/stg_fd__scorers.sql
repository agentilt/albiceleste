with src as ({{ latest('fd', 'scorers') }})
select
    payload->'competition'->>'code'                  as fd_code,
    (payload->'season'->>'startDate')::date          as season_start,
    (s->'player'->>'id')::int                        as fd_person_id,
    s->'player'->>'name'                             as full_name,
    nullif(s->'player'->>'dateOfBirth', '')::date    as dob,
    s->'player'->>'nationality'                      as nationality,
    (s->'team'->>'id')::int                          as fd_team_id,
    s->'team'->>'name'                               as team_name,
    (s->>'goals')::int                               as goals,
    (s->>'assists')::int                             as assists,
    (s->>'penalties')::int                           as penalties,
    (s->>'playedMatches')::int                       as played_matches,
    ingested_at                                      as as_of
from src, jsonb_array_elements(payload->'scorers') s
