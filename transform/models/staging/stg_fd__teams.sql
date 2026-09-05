with src as ({{ latest('fd', 'team') }})
select
    payload->>'_competition'                    as fd_code,
    (payload->>'id')::int                       as fd_team_id,
    payload->>'name'                            as team_name,
    {{ norm_name("payload->>'name'") }}         as team_name_norm,
    payload->>'shortName'                       as short_name,
    payload->>'tla'                             as tla,
    payload->'area'->>'name'                    as country,
    payload->>'crest'                           as crest_url,
    (payload->'_season'->>'startDate')::date    as season_start,
    ingested_at                                 as as_of
from src
