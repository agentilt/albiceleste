with src as ({{ latest('fd', 'match') }})
select
    (payload->>'id')::int                            as fd_match_id,
    payload->>'_competition'                         as fd_code,
    (payload->>'utcDate')::timestamptz               as kickoff_utc,
    (payload->>'utcDate')::timestamptz::date         as match_date,
    payload->>'status'                               as status,
    (payload->>'matchday')::int                      as matchday,
    payload->>'stage'                                as stage,
    (payload->'season'->>'startDate')::date          as season_start,
    (payload->'homeTeam'->>'id')::int                as home_team_id,
    payload->'homeTeam'->>'name'                     as home_team_name,
    (payload->'awayTeam'->>'id')::int                as away_team_id,
    payload->'awayTeam'->>'name'                     as away_team_name,
    (payload->'score'->'fullTime'->>'home')::int     as home_score,
    (payload->'score'->'fullTime'->>'away')::int     as away_score,
    payload->'score'->>'winner'                      as winner,
    ingested_at                                      as as_of
from src
