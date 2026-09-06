select
    competition_id        as tm_competition_id,
    competition_code,
    name                  as competition_name,
    type                  as competition_type,
    sub_type,
    country_name,
    confederation,
    domestic_league_code,
    snapshot_date
from {{ source('raw_tm', 'competitions') }}
