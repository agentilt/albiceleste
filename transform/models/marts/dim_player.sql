with p as (select * from {{ ref('int_players') }}),
squad as (select * from {{ ref('int_espn_squad_current') }} where is_primary_roster),
teams as (select * from {{ ref('dim_team') }}),
comps as (select * from {{ ref('dim_competition') }}),
hl as (select athlete_id, min(hl_player_id) as hl_player_id from {{ ref('int_player_xref_hl') }} group by athlete_id),
fpl as (select player_key, element_id from {{ ref('int_player_xref_fpl') }}),
tmx as (select x.player_key, x.tm_player_id, t.market_value_eur, t.highest_market_value_eur, t.international_caps as tm_international_caps, t.contract_expiration_date, t.sub_position from {{ ref('int_player_xref_tm') }} x join {{ ref('stg_tm__players') }} t using (tm_player_id))
select
    p.player_key,
    coalesce(s.full_name, ath.full_name, p.full_name)                as full_name,
    p.full_name                                                       as source_name,
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
    coalesce(tmx.tm_player_id::text, p.transfermarkt_id) as transfermarkt_id,
    tmx.market_value_eur,
    tmx.highest_market_value_eur,
    tmx.tm_international_caps,
    tmx.contract_expiration_date,
    -- the detailed role for the pitch depth chart: Transfermarkt's sub-position mapped to eleven slots
    tmx.sub_position,
    case tmx.sub_position
        when 'Goalkeeper' then 'GK'
        when 'Right-Back' then 'RB'
        when 'Centre-Back' then 'CB'
        when 'Left-Back' then 'LB'
        when 'Defensive Midfield' then 'DM'
        when 'Central Midfield' then 'CM'
        when 'Attacking Midfield' then 'AM'
        when 'Right Winger' then 'RW'
        when 'Right Midfield' then 'RW'
        when 'Left Winger' then 'LW'
        when 'Left Midfield' then 'LW'
        when 'Centre-Forward' then 'ST'
        when 'Second Striker' then 'ST'
    end                                                            as role,
    p.fbref_id,
    p.soccerway_id
from p
left join squad s on s.athlete_id = p.espn_athlete_id
left join {{ ref('int_espn_athletes') }} ath on ath.athlete_id = p.espn_athlete_id
left join teams t on t.league = s.league and t.espn_team_id = s.team_id
left join comps c on c.league = s.league
left join hl on hl.athlete_id = p.espn_athlete_id
left join fpl on fpl.player_key = p.player_key
left join tmx on tmx.player_key = p.player_key
