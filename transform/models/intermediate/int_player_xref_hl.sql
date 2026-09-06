{#- Highlightly box-score player -> ESPN athlete.
    Pass 0: hand-pinned overrides (seeds/player_xref_overrides).
    Pass 1: ESPN roster players of the mapped team, compatible names.
    Pass 2: any roster in the same league (player moved within the data window), compatible and score >= 0.6.
    Pass 3: any league, compatible and score >= 0.9 (near-exact).
    One ESPN athlete per Highlightly id; an athlete may receive several Highlightly ids only via overrides
    (Highlightly occasionally has duplicate ids for one person). -#}
with hl as (
    select distinct h.league, h.hl_team_id, h.hl_player_id, h.full_name, h.name_norm, h.short_name_norm
    from {{ ref('stg_highlightly__player_match_stats') }} h
),
ovr as (select hl_player_id, espn_athlete_id from {{ ref('player_xref_overrides') }} where hl_player_id is not null and espn_athlete_id is not null),
tx as (select league, espn_team_id, hl_team_id from {{ ref('int_team_xref') }} where hl_team_id is not null),
roster as (select distinct league, team_id, athlete_id, name_norm from {{ ref('stg_espn__roster_players') }}),
scored as (
    select hl.hl_player_id, hl.full_name, r.athlete_id, r.league as roster_league, r.team_id as roster_team_id,
           tx.espn_team_id = r.team_id and tx.league = r.league as same_team,
           r.league = hl.league as same_league,
           greatest({{ name_score('hl.name_norm', 'r.name_norm') }}, {{ name_score('hl.short_name_norm', 'r.name_norm') }}) as score
    from hl
    left join tx on tx.league = hl.league and tx.hl_team_id = hl.hl_team_id
    join roster r on true
    where ({{ names_compatible('hl.name_norm', 'r.name_norm') }} or {{ names_compatible('hl.short_name_norm', 'r.name_norm') }})
      and not exists (select 1 from ovr where ovr.hl_player_id = hl.hl_player_id)
),
cand as (
    select hl_player_id, full_name, athlete_id, score,
           case when same_team then 1 when same_league and score >= 0.6 then 2 when score >= 0.9 then 3 end as pass
    from scored
),
best as (
    select hl_player_id, full_name, athlete_id, score, pass from (
        select *, row_number() over (partition by hl_player_id order by pass, score desc) rn
        from cand where pass is not null
    ) x where rn = 1
),
uniq as (
    select *, row_number() over (partition by athlete_id order by pass, score desc) rn_a from best
)
select hl_player_id, full_name as hl_player_name, athlete_id, score, pass, false as is_override
from uniq where rn_a = 1
union all
select o.hl_player_id, (select min(full_name) from hl where hl.hl_player_id = o.hl_player_id), o.espn_athlete_id, 1.0, 0, true
from ovr o
