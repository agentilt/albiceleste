{#- Entity-resolution leftovers for human review. -#}
with tx as (select * from {{ ref('int_team_xref') }}),
hl_teams as (
    select league, home_team_id as hl_team_id, home_team_name as name from {{ ref('stg_highlightly__matches') }}
    union select league, away_team_id, away_team_name from {{ ref('stg_highlightly__matches') }}
),
hl_players as (select distinct league, hl_team_id, team_name, hl_player_id, full_name from {{ ref('stg_highlightly__player_match_stats') }}),
xh as (select * from {{ ref('int_player_xref_hl') }})
select 'espn_team_without_highlightly' as issue, league, team_name as subject, espn_team_id::text as subject_id, null::text as detail
from tx where hl_team_id is null
union all
select 'highlightly_team_without_espn', h.league, h.name, h.hl_team_id::text, null
from hl_teams h where not exists (select 1 from tx where tx.hl_team_id = h.hl_team_id)
union all
select 'espn_team_without_fd', tx.league, tx.team_name, tx.espn_team_id::text, null
from tx join {{ ref('dim_competition') }} c on c.league = tx.league where c.fd_code is not null and tx.fd_team_id is null
union all
select 'highlightly_player_unmatched', p.league, p.full_name, p.hl_player_id::text, p.team_name
from hl_players p where not exists (select 1 from xh where xh.hl_player_id = p.hl_player_id)
union all
select 'espn_argentine_without_wikidata', d.current_league, d.full_name, d.espn_athlete_id, d.current_team_name
from {{ ref('dim_player') }} d where d.identity_source = 'espn'
