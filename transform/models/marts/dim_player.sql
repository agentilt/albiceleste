with p as (select * from {{ ref('int_players') }}),
squad as (select * from {{ ref('int_espn_squad_current') }} where is_primary_roster),
teams as (select * from {{ ref('dim_team') }}),
comps as (select * from {{ ref('dim_competition') }}),
hl as (select athlete_id, hl_player_id from {{ ref('int_player_xref_hl') }}),
fpl as (select player_key, element_id from {{ ref('int_player_xref_fpl') }})
select
    p.player_key,
    p.full_name,
    p.dob,
    case when p.dob is not null then extract(year from age(current_date, p.dob))::int end as age,
    p.citizenships,
    p.positions,
    coalesce(s.position_name, p.positions[1])                     as primary_position,
    p.place_of_birth,
    p.height_cm,
    p.is_argentine_citizen,
    p.has_arg_senior_cap,
    p.has_arg_youth_cap,
    p.has_other_senior_cap,
    p.other_senior_teams,
    p.first_arg_senior_cap_date,
    p.eligibility_status,
    p.eligibility_basis,
    p.identity_source,
    -- current situation (from the latest ESPN roster snapshot)
    s.team_id is not null                                         as in_tracked_squad,
    t.team_key                                                    as current_team_key,
    s.team_id                                                     as current_espn_team_id,
    t.team_name                                                   as current_team_name,
    s.league                                                      as current_league,
    c.competition_name                                            as current_competition,
    c.country                                                     as current_country,
    c.level_rank                                                  as current_competition_level_rank,
    case when s.league is null then null else s.league <> 'arg.1' end as is_abroad,
    s.jersey,
    s.n_injuries > 0                                              as is_injured,
    s.injury_status,
    s.as_of                                                       as squad_as_of,
    -- source ids
    p.wikidata_qid,
    p.espn_athlete_id,
    p.fd_person_id,
    hl.hl_player_id,
    fpl.element_id                                                as fpl_element_id,
    p.transfermarkt_id,
    p.fbref_id,
    p.soccerway_id
from p
left join squad s on s.athlete_id = p.espn_athlete_id
left join teams t on t.league = s.league and t.espn_team_id = s.team_id
left join comps c on c.league = s.league
left join hl on hl.athlete_id = p.espn_athlete_id
left join fpl on fpl.player_key = p.player_key
