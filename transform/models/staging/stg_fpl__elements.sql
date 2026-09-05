with src as ({{ latest('fpl', 'element') }})
select
    (payload->>'id')::int                            as element_id,
    (payload->>'code')::int                          as player_code,
    payload->>'opta_code'                            as opta_code,
    payload->>'web_name'                             as web_name,
    payload->>'first_name'                           as first_name,
    payload->>'second_name'                          as second_name,
    (payload->>'first_name') || ' ' || (payload->>'second_name') as full_name,
    {{ norm_name("(payload->>'first_name') || ' ' || (payload->>'second_name')") }} as name_norm,
    nullif(payload->>'birth_date', '')::date         as dob,
    nullif(payload->>'region', '')::int              as region,
    (payload->>'team')::int                          as fpl_team_id,
    (payload->>'element_type')::int                  as element_type,
    (payload->>'minutes')::int                       as minutes,
    (payload->>'starts')::int                        as starts,
    (payload->>'goals_scored')::int                  as goals,
    (payload->>'assists')::int                       as assists,
    (payload->>'expected_goals')::numeric            as xg,
    (payload->>'expected_assists')::numeric          as xa,
    payload->>'status'                               as status,
    payload->>'news'                                 as news,
    ingested_at                                      as as_of
from src
