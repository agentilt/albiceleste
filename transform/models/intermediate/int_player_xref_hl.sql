{#- Highlightly box-score player -> ESPN athlete. Candidates are ESPN roster players of the mapped team;
    names must be compatible (Highlightly often abbreviates given names, e.g. "K. Scherpen"). -#}
with hl as (
    select distinct h.league, h.hl_team_id, h.hl_player_id, h.full_name, h.name_norm, h.short_name_norm
    from {{ ref('stg_highlightly__player_match_stats') }} h
),
tx as (select league, espn_team_id, hl_team_id from {{ ref('int_team_xref') }} where hl_team_id is not null),
roster as (select distinct league, team_id, athlete_id, name_norm from {{ ref('stg_espn__roster_players') }}),
cand as (
    select hl.hl_player_id, hl.full_name, r.athlete_id,
           greatest({{ name_score('hl.name_norm', 'r.name_norm') }}, {{ name_score('hl.short_name_norm', 'r.name_norm') }}) as score
    from hl
    join tx on tx.league = hl.league and tx.hl_team_id = hl.hl_team_id
    join roster r on r.league = tx.league and r.team_id = tx.espn_team_id
    where {{ names_compatible('hl.name_norm', 'r.name_norm') }}
       or {{ names_compatible('hl.short_name_norm', 'r.name_norm') }}
),
best as (
    select hl_player_id, full_name, athlete_id, score from (
        select *, row_number() over (partition by hl_player_id order by score desc) rn from cand
    ) x where rn = 1
),
uniq as (
    select *, row_number() over (partition by athlete_id order by score desc) rn_a from best
)
select hl_player_id, full_name as hl_player_name, athlete_id, score
from uniq where rn_a = 1
