with src as ({{ latest('wikidata', 'player') }})
select
    payload->>'qid'                                              as wikidata_qid,
    payload->>'name'                                             as full_name,
    {{ norm_name("payload->>'name'") }}                          as name_norm,
    nullif(payload->>'dob', '')::timestamptz::date               as dob,
    payload->>'gender'                                           as gender,
    payload->>'place_of_birth'                                   as place_of_birth,
    array(select jsonb_array_elements_text(payload->'citizenships')) as citizenships,
    array(select jsonb_array_elements_text(payload->'positions'))    as positions,
    payload->>'transfermarkt_id'                                 as transfermarkt_id,
    payload->>'fbref_id'                                         as fbref_id,
    payload->>'soccerway_id'                                     as soccerway_id,
    payload->>'espn_id'                                          as espn_id,
    nullif(payload->>'height_cm', '')::numeric                   as height_cm,
    ingested_at                                                  as as_of
from src
