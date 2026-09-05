with src as ({{ latest('wikidata', 'player_memberships') }}),
exploded as (
    select payload->>'qid' as wikidata_qid, ms
    from src, jsonb_array_elements(payload->'memberships') ms
),
typed as (
    select
        wikidata_qid,
        ms->>'team_qid'                                   as team_qid,
        ms->>'team'                                       as team_name,
        ms->>'team_country'                               as team_country,
        array(select jsonb_array_elements_text(ms->'team_types')) as team_types,
        array_to_string(array(select jsonb_array_elements_text(ms->'team_types')), ' ') as team_types_text,
        nullif(ms->>'start', '')::timestamptz::date       as start_date,
        nullif(ms->>'end', '')::timestamptz::date         as end_date,
        nullif(ms->>'matches', '')::numeric::int          as matches,
        nullif(ms->>'goals', '')::numeric::int            as goals
    from exploded
)
select
    *,
    team_types_text ilike '%national%'                                                  as is_national_team,
    (team_types_text ilike '%women%' or team_name ilike '%women%')                       as is_women,
    (team_types_text ~* '(under-?[0-9]|youth|olympic)' or team_name ~* '(under|U-?[12][0-9]|olympic|youth|juvenil)') as is_youth,
    team_country = 'Argentina'                                                          as is_argentina
from typed
