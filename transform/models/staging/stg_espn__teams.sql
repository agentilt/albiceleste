with src as ({{ latest('espn', 'team') }})
select
    payload->>'_league'                       as league,
    payload->>'id'                            as team_id,
    payload->>'displayName'                   as team_name,
    {{ norm_name("payload->>'displayName'") }} as team_name_norm,
    payload->>'shortDisplayName'              as short_name,
    payload->>'abbreviation'                  as abbreviation,
    payload->>'location'                      as location,
    payload->'logos'->0->>'href'              as logo_url,
    ingested_at                               as as_of
from src
