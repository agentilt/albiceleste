select
    club_id::int                          as tm_club_id,
    name                                  as club_name,
    {{ norm_name('name') }}               as club_name_norm,
    club_code,
    domestic_competition_id               as tm_competition_id,
    nullif(squad_size, '')::int           as squad_size,
    {{ safe_numeric('average_age') }}     as average_age,
    nullif(national_team_players, '')::int as national_team_players,
    stadium_name,
    coach_name,
    nullif(last_season, '')::int          as last_season,
    snapshot_date
from {{ source('raw_tm', 'clubs') }}
