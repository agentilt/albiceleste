select
    espn_code                as league,
    competition_name,
    country,
    confederation,
    tier,
    level_rank,
    fd_code,
    highlightly_league_id,
    is_argentina_domestic,
    in_watch
from {{ ref('competitions') }}
