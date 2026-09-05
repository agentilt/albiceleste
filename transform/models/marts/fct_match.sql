with ev as (select * from {{ ref('stg_espn__events') }}),
x as (select * from {{ ref('int_match_xref') }}),
c as (select * from {{ ref('dim_competition') }})
select
    'espn:' || ev.event_id                as match_key,
    ev.event_id                           as espn_event_id,
    x.hl_match_id,
    x.fd_match_id,
    ev.league,
    c.competition_name,
    c.country,
    c.level_rank                          as competition_level_rank,
    ev.season_year,
    ev.kickoff_utc,
    ev.match_date,
    ev.status,
    ev.is_completed,
    ev.league || ':' || ev.home_team_id   as home_team_key,
    ev.home_team_id                       as home_espn_team_id,
    ev.home_team_name,
    ev.home_score,
    ev.league || ':' || ev.away_team_id   as away_team_key,
    ev.away_team_id                       as away_espn_team_id,
    ev.away_team_name,
    ev.away_score,
    ev.venue,
    ev.attendance
from ev
left join x on x.event_id = ev.event_id
left join c on c.league = ev.league
