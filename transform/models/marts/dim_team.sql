with x as (select * from {{ ref('int_team_xref') }}),
e as (select * from {{ ref('stg_espn__teams') }}),
c as (select * from {{ ref('dim_competition') }})
select
    e.league || ':' || e.team_id   as team_key,
    e.league,
    c.competition_name,
    c.country,
    c.level_rank                   as competition_level_rank,
    e.team_id                      as espn_team_id,
    e.team_name,
    e.short_name,
    e.abbreviation,
    e.logo_url,
    x.hl_team_id,
    x.fd_team_id
from e
left join x on x.league = e.league and x.espn_team_id = e.team_id
left join c on c.league = e.league
