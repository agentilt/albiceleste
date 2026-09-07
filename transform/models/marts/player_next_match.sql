{#- The next scheduled match of each tracked player's current club, from the ESPN scoreboard fetched a week ahead. -#}
with h as (select {{ data_horizon() }} as horizon),
d as (select player_key, current_espn_team_id from {{ ref('dim_player') }} where in_tracked_squad and current_espn_team_id is not null),
m as (
    select match_key, league, competition_name, kickoff_utc, match_date, home_espn_team_id, away_espn_team_id, home_team_name, away_team_name, status
    from {{ ref('fct_match') }}
    where not is_completed and match_date >= (select horizon from h)
),
nxt as (
    select d.player_key, m.match_key, m.league, m.competition_name, m.kickoff_utc, m.match_date,
           case when m.home_espn_team_id = d.current_espn_team_id then m.away_team_name else m.home_team_name end as opponent,
           m.home_espn_team_id = d.current_espn_team_id as is_home,
           row_number() over (partition by d.player_key order by m.kickoff_utc) as rn
    from d
    join m on d.current_espn_team_id in (m.home_espn_team_id, m.away_espn_team_id)
)
select player_key, match_key, league, competition_name, kickoff_utc, match_date, opponent, is_home
from nxt where rn = 1
