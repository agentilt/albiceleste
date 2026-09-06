select
    game_id::bigint                        as tm_game_id,
    competition_id                         as tm_competition_id,
    nullif(season, '')::int                as season,
    round,
    {{ safe_date('date') }}                as match_date,
    nullif(home_club_id, '')::int          as home_club_id,
    nullif(away_club_id, '')::int          as away_club_id,
    home_club_name, away_club_name,
    nullif(home_club_goals, '')::int       as home_goals,
    nullif(away_club_goals, '')::int       as away_goals,
    nullif(attendance, '')::int            as attendance,
    competition_type,
    snapshot_date
from {{ source('raw_tm', 'games') }}
