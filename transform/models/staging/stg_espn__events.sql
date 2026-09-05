with src as ({{ latest('espn', 'event') }}),
base as (
    select
        payload->>'id'                                           as event_id,
        payload->>'_league'                                      as league,
        (payload->>'date')::timestamptz                          as kickoff_utc,
        (payload->'season'->>'year')::int                        as season_year,
        payload->'season'->>'type'                               as season_type,
        payload->'status'->'type'->>'name'                       as status,
        (payload->'status'->'type'->>'completed')::boolean       as is_completed,
        payload->'competitions'->0->'competitors'                as competitors,
        payload->'competitions'->0->'venue'->>'fullName'         as venue,
        nullif(payload->'competitions'->0->>'attendance', '')::int as attendance,
        ingested_at                                              as as_of
    from src
)
select
    event_id, league, kickoff_utc, kickoff_utc::date as match_date, season_year, season_type, status, is_completed,
    (select c->'team'->>'id'            from jsonb_array_elements(competitors) c where c->>'homeAway' = 'home' limit 1) as home_team_id,
    (select c->'team'->>'displayName'   from jsonb_array_elements(competitors) c where c->>'homeAway' = 'home' limit 1) as home_team_name,
    (select nullif(c->>'score','')::int from jsonb_array_elements(competitors) c where c->>'homeAway' = 'home' limit 1) as home_score,
    (select c->'team'->>'id'            from jsonb_array_elements(competitors) c where c->>'homeAway' = 'away' limit 1) as away_team_id,
    (select c->'team'->>'displayName'   from jsonb_array_elements(competitors) c where c->>'homeAway' = 'away' limit 1) as away_team_name,
    (select nullif(c->>'score','')::int from jsonb_array_elements(competitors) c where c->>'homeAway' = 'away' limit 1) as away_score,
    venue, attendance, as_of
from base
