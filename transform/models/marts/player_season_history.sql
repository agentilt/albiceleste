{#- Multi-season club statistics per tracked player, from Transfermarkt appearances (all competitions,
    frozen 2026-06-28). Complements fct_player_match_stats, which starts in 2024-07. -#}
with x as (select * from {{ ref('int_player_xref_tm') }}),
a as (select * from {{ ref('stg_tm__appearances') }}),
g as (select tm_game_id, season, tm_competition_id as game_competition_id from {{ ref('stg_tm__games') }}),
comp as (select * from {{ ref('stg_tm__competitions') }}),
c as (select tm_club_id, club_name from {{ ref('stg_tm__clubs') }}),
d as (select player_key, full_name from {{ ref('dim_player') }})
select
    x.player_key, d.full_name,
    g.season,
    a.tm_competition_id, comp.competition_name, comp.country_name as competition_country, comp.competition_type,
    a.tm_club_id, c.club_name,
    count(*)                                  as appearances,
    sum(a.minutes_played)                     as minutes,
    sum(a.goals)                              as goals,
    sum(a.assists)                            as assists,
    sum(a.yellow_cards)                       as yellow_cards,
    sum(a.red_cards)                          as red_cards,
    min(a.match_date)                         as first_match_date,
    max(a.match_date)                         as last_match_date,
    'transfermarkt'                           as source
from a
join x using (tm_player_id)
join d using (player_key)
join g on g.tm_game_id = a.tm_game_id
left join comp on comp.tm_competition_id = a.tm_competition_id
left join c on c.tm_club_id = a.tm_club_id
group by x.player_key, d.full_name, g.season, a.tm_competition_id, comp.competition_name, comp.country_name, comp.competition_type, a.tm_club_id, c.club_name
