select x.player_key, v.valuation_date, v.market_value_eur, v.tm_club_id, v.tm_competition_id
from {{ ref('stg_tm__player_valuations') }} v
join {{ ref('int_player_xref_tm') }} x using (tm_player_id)
