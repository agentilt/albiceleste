{#- The watch: the players the national team is realistically choosing from. A previous senior cap, a place in any published
    list, or a club in a competition flagged in_watch (Europe and Brazil). MLS, Mexico, Saudi Arabia and the Argentine league
    count only through a cap or a list. `in_watch_now` is the horizon view; the ranking evaluates the club part per date. -#}
with caps as (select player_key, coalesce(has_arg_senior_cap, false) as has_cap, current_league from {{ ref('dim_player') }}),
listed as (select distinct player_key from {{ ref('int_squad_calls') }} where player_key is not null),
comp as (select league, in_watch from {{ ref('dim_competition') }})
select c.player_key, c.has_cap, (l.player_key is not null) as in_any_list,
       (c.has_cap or l.player_key is not null or coalesce(comp.in_watch, false)) as in_watch_now
from caps c
left join listed l using (player_key)
left join comp on comp.league = c.current_league
