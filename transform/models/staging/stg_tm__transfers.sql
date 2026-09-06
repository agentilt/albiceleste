select
    player_id::int                              as tm_player_id,
    player_name,
    {{ safe_date('transfer_date') }}            as transfer_date,
    transfer_season,
    nullif(from_club_id, '')::int               as from_club_id,
    from_club_name,
    nullif(to_club_id, '')::int                 as to_club_id,
    to_club_name,
    {{ safe_numeric('transfer_fee') }}          as transfer_fee_eur,
    {{ safe_numeric('market_value_in_eur') }}   as market_value_eur,
    snapshot_date
from {{ source('raw_tm', 'transfers') }}
