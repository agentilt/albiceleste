with src as ({{ latest('fd', 'standings') }})
select
    payload->'competition'->>'code'              as fd_code,
    (payload->'season'->>'startDate')::date      as season_start,
    (payload->'season'->>'currentMatchday')::int as matchday,
    (row->'team'->>'id')::int                    as fd_team_id,
    row->'team'->>'name'                         as team_name,
    (row->>'position')::int                      as position,
    (row->>'playedGames')::int                   as played,
    (row->>'won')::int                           as won,
    (row->>'draw')::int                          as drawn,
    (row->>'lost')::int                          as lost,
    (row->>'points')::int                        as points,
    (row->>'goalsFor')::int                      as goals_for,
    (row->>'goalsAgainst')::int                  as goals_against,
    ingested_at                                  as as_of
from src,
     jsonb_array_elements(payload->'standings') st,
     jsonb_array_elements(st->'table') row
where st->>'type' = 'TOTAL'
