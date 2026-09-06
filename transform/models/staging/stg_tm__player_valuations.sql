select
    player_id::int                              as tm_player_id,
    {{ safe_date('date') }}                     as valuation_date,
    {{ safe_numeric('market_value_in_eur') }}   as market_value_eur,
    nullif(current_club_id, '')::int            as tm_club_id,
    player_club_domestic_competition_id         as tm_competition_id,
    snapshot_date
from {{ source('raw_tm', 'player_valuations') }}
