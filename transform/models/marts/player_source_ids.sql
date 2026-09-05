{#- Long-format crosswalk: one row per (player, source, id). -#}
with d as (select * from {{ ref('dim_player') }})
select player_key, 'wikidata' as source, wikidata_qid as source_id from d where wikidata_qid is not null
union all select player_key, 'espn', espn_athlete_id from d where espn_athlete_id is not null
union all select player_key, 'football_data', fd_person_id::text from d where fd_person_id is not null
union all select player_key, 'highlightly', hl_player_id::text from d where hl_player_id is not null
union all select player_key, 'fpl', fpl_element_id::text from d where fpl_element_id is not null
union all select player_key, 'transfermarkt', transfermarkt_id from d where transfermarkt_id is not null
union all select player_key, 'fbref', fbref_id from d where fbref_id is not null
union all select player_key, 'soccerway', soccerway_id from d where soccerway_id is not null
