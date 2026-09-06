with x as (select * from {{ ref('int_team_xref') }}),
cur as (select * from {{ ref('stg_espn__teams') }}),
hist as (
    select league, team_id, min(team_name) as team_name from (
        select league, home_team_id as team_id, home_team_name as team_name from {{ ref('stg_espn__events') }}
        union all
        select league, away_team_id, away_team_name from {{ ref('stg_espn__events') }}
    ) h where team_id is not null group by 1, 2
),
e as (
    select league, team_id, team_name, short_name, abbreviation, logo_url, true as is_current_member from cur
    union all
    select h.league, h.team_id, h.team_name, null, null, null, false from hist h
    where not exists (select 1 from cur where cur.league = h.league and cur.team_id = h.team_id)
),
c as (select * from {{ ref('dim_competition') }})
select
    e.league || ':' || e.team_id   as team_key,
    e.is_current_member,
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
