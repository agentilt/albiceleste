select
    appearance_id                          as tm_appearance_id,
    game_id::bigint                        as tm_game_id,
    player_id::int                         as tm_player_id,
    nullif(player_club_id, '')::int        as tm_club_id,
    {{ safe_date('date') }}                as match_date,
    competition_id                         as tm_competition_id,
    nullif(minutes_played, '')::int        as minutes_played,
    nullif(goals, '')::int                 as goals,
    nullif(assists, '')::int               as assists,
    nullif(yellow_cards, '')::int          as yellow_cards,
    nullif(red_cards, '')::int             as red_cards,
    snapshot_date
from {{ source('raw_tm', 'appearances') }}
