with src as ({{ latest('fd', 'competition') }})
select
    payload->>'code'                                    as fd_code,
    (payload->>'id')::int                               as fd_competition_id,
    payload->>'name'                                    as competition_name,
    payload->'area'->>'name'                            as country,
    payload->>'type'                                    as competition_type,
    payload->>'plan'                                    as plan,
    (payload->'currentSeason'->>'startDate')::date      as season_start,
    (payload->'currentSeason'->>'endDate')::date        as season_end,
    (payload->'currentSeason'->>'currentMatchday')::int as current_matchday
from src
