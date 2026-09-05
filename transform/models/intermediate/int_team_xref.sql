{#- ESPN team <-> Highlightly team <-> football-data.org team, per league.
    Score = 0.6 * whole-name trigram similarity + 0.4 * best word containment, so "Barcelona" prefers
    "FC Barcelona" over "RCD Espanyol de Barcelona". Assignment is mutual-best in two passes (the second pass
    re-matches whatever both sides left unassigned). Hand-pinned overrides win and are excluded from the
    automatic search on both sides. Unmatched teams surface in dq_unmatched. -#}
with comps as (select * from {{ ref('competitions') }}),
ovr as (select * from {{ ref('team_xref_overrides') }}),
espn as (select league, team_id, team_name, team_name_norm from {{ ref('stg_espn__teams') }}),
hl as (
    select league, home_team_id as hl_team_id, home_team_name as hl_team_name, home_team_name_norm as name_norm from {{ ref('stg_highlightly__matches') }}
    union
    select league, away_team_id, away_team_name, away_team_name_norm from {{ ref('stg_highlightly__matches') }}
),
fd as (
    select c.espn_code as league, t.fd_team_id, t.team_name as fd_team_name, t.team_name_norm as name_norm
    from {{ ref('stg_fd__teams') }} t join comps c on c.fd_code = t.fd_code
),

-- ---------------------------------------------------------------- Highlightly
hl_cand as (
    select e.league, e.team_id, h.hl_team_id, h.hl_team_name,
           0.6 * similarity(e.team_name_norm, h.name_norm)
         + 0.4 * greatest(word_similarity(e.team_name_norm, h.name_norm), word_similarity(h.name_norm, e.team_name_norm)) as score
    from espn e join hl h using (league)
    where not exists (select 1 from ovr where ovr.hl_team_id is not null and (ovr.espn_team_id = e.team_id or ovr.hl_team_id = h.hl_team_id))
),
hl_p1 as (
    select league, team_id, hl_team_id, hl_team_name, score from (
        select *, row_number() over (partition by league, team_id order by score desc) rn_e,
                  row_number() over (partition by league, hl_team_id order by score desc) rn_h
        from hl_cand where score >= 0.35
    ) x where rn_e = 1 and rn_h = 1
),
hl_p2 as (
    select league, team_id, hl_team_id, hl_team_name, score from (
        select c.*, row_number() over (partition by c.league, c.team_id order by c.score desc) rn_e,
                    row_number() over (partition by c.league, c.hl_team_id order by c.score desc) rn_h
        from hl_cand c
        where c.score >= 0.35
          and not exists (select 1 from hl_p1 p where p.league = c.league and p.team_id = c.team_id)
          and not exists (select 1 from hl_p1 p where p.hl_team_id = c.hl_team_id)
    ) x where rn_e = 1 and rn_h = 1
),
hl_best as (select * from hl_p1 union all select * from hl_p2),

-- ---------------------------------------------------------------- football-data.org
fd_cand as (
    select e.league, e.team_id, f.fd_team_id, f.fd_team_name,
           0.6 * similarity(e.team_name_norm, f.name_norm)
         + 0.4 * greatest(word_similarity(e.team_name_norm, f.name_norm), word_similarity(f.name_norm, e.team_name_norm)) as score
    from espn e join fd f using (league)
    where not exists (select 1 from ovr where ovr.fd_team_id is not null and (ovr.espn_team_id = e.team_id or ovr.fd_team_id = f.fd_team_id))
),
fd_p1 as (
    select league, team_id, fd_team_id, fd_team_name, score from (
        select *, row_number() over (partition by league, team_id order by score desc) rn_e,
                  row_number() over (partition by league, fd_team_id order by score desc) rn_f
        from fd_cand where score >= 0.35
    ) x where rn_e = 1 and rn_f = 1
),
fd_p2 as (
    select league, team_id, fd_team_id, fd_team_name, score from (
        select c.*, row_number() over (partition by c.league, c.team_id order by c.score desc) rn_e,
                    row_number() over (partition by c.league, c.fd_team_id order by c.score desc) rn_f
        from fd_cand c
        where c.score >= 0.35
          and not exists (select 1 from fd_p1 p where p.league = c.league and p.team_id = c.team_id)
          and not exists (select 1 from fd_p1 p where p.fd_team_id = c.fd_team_id)
    ) x where rn_e = 1 and rn_f = 1
),
fd_best as (select * from fd_p1 union all select * from fd_p2)

select
    e.league, e.team_id as espn_team_id, e.team_name,
    coalesce(o.hl_team_id, hb.hl_team_id)                                                            as hl_team_id,
    coalesce((select min(hl_team_name) from hl where hl.hl_team_id = o.hl_team_id), hb.hl_team_name)  as hl_team_name,
    case when o.hl_team_id is not null then 1.0 else hb.score end                                     as hl_score,
    coalesce(o.fd_team_id, fb.fd_team_id)                                                            as fd_team_id,
    coalesce((select min(fd_team_name) from fd where fd.fd_team_id = o.fd_team_id), fb.fd_team_name)  as fd_team_name,
    case when o.fd_team_id is not null then 1.0 else fb.score end                                     as fd_score,
    o.espn_team_id is not null                                                                       as has_override
from espn e
left join ovr o on o.espn_team_id = e.team_id
left join hl_best hb on hb.league = e.league and hb.team_id = e.team_id
left join fd_best fb on fb.league = e.league and fb.team_id = e.team_id
