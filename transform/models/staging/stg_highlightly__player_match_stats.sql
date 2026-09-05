with src as ({{ latest('highlightly', 'boxscore') }}),
teams as (
    select
        (payload->>'matchId')::bigint  as hl_match_id,
        payload->>'_espn_league'       as league,
        (t->'team'->>'id')::bigint     as hl_team_id,
        t->'team'->>'name'             as team_name,
        p
    from src, jsonb_array_elements(payload->'teams') t, jsonb_array_elements(coalesce(t->'players', '[]')) p
),
parsed as (
    select
        *,
        case when jsonb_typeof(p->'statistics') = 'array' then p->'statistics'->0 else p->'statistics' end as st
    from teams
)
select
    hl_match_id, league, hl_team_id, team_name,
    (p->>'id')::bigint                                  as hl_player_id,
    p->>'name'                                          as player_name,
    coalesce(p->>'fullName', p->>'name')                as full_name,
    {{ norm_name("p->>'name'") }}                       as short_name_norm,
    {{ norm_name("coalesce(p->>'fullName', p->>'name')") }} as name_norm,
    p->>'position'                                      as position_name,
    nullif(p->>'shirtNumber', '')::int                  as shirt_number,
    coalesce((p->>'isSubstitute')::boolean, false)      as is_substitute,
    coalesce((p->>'isCaptain')::boolean, false)         as is_captain,
    nullif(p->>'minutesPlayed', '')::int                as minutes_played,
    nullif(p->>'matchRating', '')::numeric              as match_rating,
    (st->>'goalsScored')::int                           as goals,
    (st->>'assists')::int                               as assists,
    (st->>'shotsTotal')::int                            as shots,
    (st->>'shotsOnTarget')::int                         as shots_on_target,
    (st->>'passesTotal')::int                           as passes,
    (st->>'passesSuccessful')::int                      as passes_completed,
    (st->>'passesKey')::int                             as key_passes,
    (st->>'tacklesTotal')::int                          as tackles,
    (st->>'interceptionsTotal')::int                    as interceptions,
    (st->>'duelsTotal')::int                            as duels,
    (st->>'duelsWon')::int                              as duels_won,
    (st->>'dribblesTotal')::int                         as dribbles,
    (st->>'dribblesSuccessful')::int                    as dribbles_completed,
    (st->>'fouledOthers')::int                          as fouls_committed,
    (st->>'fouledByOthers')::int                        as fouls_suffered,
    (st->>'cardsYellow')::int                           as yellow_cards,
    (st->>'cardsRed')::int                              as red_cards,
    (st->>'goalsSaved')::int                            as saves,
    (st->>'goalsConceded')::int                         as goals_conceded,
    (st->>'expectedGoals')::numeric                     as xg,
    (st->>'expectedAssists')::numeric                   as xa,
    (st->>'expectedGoalsOnTarget')::numeric             as xgot,
    (p->>'offsides')::int                               as offsides
from parsed
