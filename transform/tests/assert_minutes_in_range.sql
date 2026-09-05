-- Minutes must be between 0 and 130 (extra time in cups, generous stoppage).
select player_match_key, minutes_played
from {{ ref('fct_player_match_stats') }}
where minutes_played < 0 or minutes_played > 130
