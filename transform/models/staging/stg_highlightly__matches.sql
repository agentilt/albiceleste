with src as ({{ latest('highlightly', 'match') }})
select
    (payload->>'id')::bigint                                        as hl_match_id,
    payload->>'_espn_league'                                        as league,
    nullif(payload->>'_season', '')::int                            as season,
    (payload->>'date')::timestamptz                                 as kickoff_utc,
    (payload->>'date')::timestamptz::date                           as match_date,
    payload->>'round'                                               as round,
    payload->'state'->>'description'                                as state,
    lower(coalesce(payload->'state'->>'description', '')) like 'finish%' as is_finished,
    nullif(split_part(payload->'state'->'score'->>'current', ' - ', 1), '')::int as home_score,
    nullif(split_part(payload->'state'->'score'->>'current', ' - ', 2), '')::int as away_score,
    (payload->'homeTeam'->>'id')::bigint                            as home_team_id,
    payload->'homeTeam'->>'name'                                    as home_team_name,
    {{ norm_name("payload->'homeTeam'->>'name'") }}                 as home_team_name_norm,
    (payload->'awayTeam'->>'id')::bigint                            as away_team_id,
    payload->'awayTeam'->>'name'                                    as away_team_name,
    {{ norm_name("payload->'awayTeam'->>'name'") }}                 as away_team_name_norm,
    ingested_at                                                     as as_of
from src
where payload->>'_empty' is null and payload->>'id' is not null
