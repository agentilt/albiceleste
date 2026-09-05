{#- One row per tracked player per match. Highlightly is the primary source (minutes, xG, passing,
    duels, rating); ESPN fills matches without a box score. `stats_source` records which one. -#}
with players as (select player_key, espn_athlete_id, hl_player_id from {{ ref('dim_player') }}),
matches as (select match_key, espn_event_id, hl_match_id, league, season_year, match_date, kickoff_utc, home_espn_team_id, away_espn_team_id from {{ ref('fct_match') }}),
tx as (select * from {{ ref('int_team_xref') }}),

hl as (
    select
        m.match_key, p.player_key, h.*
    from {{ ref('stg_highlightly__player_match_stats') }} h
    join players p on p.hl_player_id = h.hl_player_id
    join matches m on m.hl_match_id = h.hl_match_id
),
es as (
    select
        m.match_key, p.player_key, s.*
    from {{ ref('stg_espn__player_match_stats') }} s
    join players p on p.espn_athlete_id = s.athlete_id
    join matches m on m.espn_event_id = s.event_id
),
combined as (
    select
        coalesce(hl.match_key, es.match_key)                          as match_key,
        coalesce(hl.player_key, es.player_key)                        as player_key,
        case when hl.hl_player_id is not null then 'highlightly' else 'espn' end as stats_source,
        coalesce(es.team_id, tx.espn_team_id)                         as espn_team_id,
        coalesce(es.is_starter, not hl.is_substitute)                 as is_starter,
        coalesce(es.subbed_in, hl.is_substitute and coalesce(hl.minutes_played, 0) > 0) as subbed_in,
        es.subbed_out,
        es.sub_in_minute,
        es.sub_out_minute,
        coalesce(hl.minutes_played, es.minutes_played)                as minutes_played,
        coalesce(hl.minutes_played, es.minutes_played, 0) > 0         as played,
        coalesce(hl.goals, es.goals)                                  as goals,
        coalesce(hl.assists, es.assists)                              as assists,
        coalesce(hl.shots, es.shots)                                  as shots,
        coalesce(hl.shots_on_target, es.shots_on_target)              as shots_on_target,
        coalesce(hl.yellow_cards, es.yellow_cards)                    as yellow_cards,
        coalesce(hl.red_cards, es.red_cards)                          as red_cards,
        coalesce(hl.fouls_committed, es.fouls_committed)              as fouls_committed,
        coalesce(hl.fouls_suffered, es.fouls_suffered)                as fouls_suffered,
        coalesce(hl.saves, es.saves)                                  as saves,
        coalesce(hl.goals_conceded, es.goals_conceded)                as goals_conceded,
        coalesce(hl.offsides, es.offsides)                            as offsides,
        es.own_goals,
        hl.passes, hl.passes_completed, hl.key_passes, hl.tackles, hl.interceptions, hl.duels, hl.duels_won,
        hl.dribbles, hl.dribbles_completed, hl.xg, hl.xa, hl.xgot, hl.match_rating, hl.is_captain,
        coalesce(hl.position_name, es.position_code)                  as position
    from hl
    full outer join es on es.match_key = hl.match_key and es.player_key = hl.player_key
    left join tx on tx.league = hl.league and tx.hl_team_id = hl.hl_team_id
)
select
    c.player_key || ':' || c.match_key       as player_match_key,
    c.*,
    m.league, m.season_year, m.match_date, m.kickoff_utc,
    c.espn_team_id = m.home_espn_team_id     as is_home
from combined c
join matches m on m.match_key = c.match_key
