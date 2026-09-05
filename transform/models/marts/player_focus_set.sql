{#- Who deserves attention by default. Everyone abroad is in; Argentine-league players enter only through
    an explicit rule, and every membership carries its reasons so the UI can say why.
    Rules (Phase 0 §5): abroad | u23_regular | capped | top_minutes_position | rising_starter
    (rising_starter = 3+ starts in the team's last 5 matches after at most 1 start in the 5 before: a role change).
    Not yet implemented: watchlists (Phase 2 feature), recent club move (needs squad history). -#}
with d as (
    select * from {{ ref('dim_player') }}
    where in_tracked_squad and eligibility_status in ('eligible', 'review')
),
current_season as (
    select league, max(season_year) as season_year from {{ ref('fct_match') }} where is_completed group by league
),
season as (
    -- one row per player: the current-season line for their current league, else their biggest current-season line
    select * from (
        select s.*, row_number() over (partition by s.player_key order by (s.league = d.current_league) desc, s.minutes desc nulls last) as rn
        from {{ ref('player_season_stats') }} s
        join current_season c on c.league = s.league and c.season_year = s.season_year
        join d on d.player_key = s.player_key
    ) x where rn = 1
),
pos_group as (
    select player_key,
           case
               when primary_position ilike 'goal%' or primary_position in ('G', 'GK') then 'GK'
               when primary_position ilike 'def%' or primary_position ~ '^(CD|LB|RB|D)' then 'DEF'
               when primary_position ilike 'mid%' or primary_position ~ '^(CM|DM|AM|LM|RM|M)' then 'MID'
               when primary_position ilike 'forw%' or primary_position ilike 'att%' or primary_position ~ '^(F|CF|LW|RW|ST)' then 'FWD'
               else 'UNK'
           end as pos_group
    from d
),
ranked_minutes as (
    select s.player_key, s.league, pg.pos_group,
           rank() over (partition by s.league, pg.pos_group order by s.minutes desc nulls last) as minutes_rank
    from season s join pos_group pg using (player_key)
),
last10 as (
    -- the player's current team's last 10 completed matches, newest first
    select d.player_key, lm.match_key, lm.rn
    from d
    join lateral (
        select m.match_key, row_number() over (order by m.kickoff_utc desc) as rn
        from {{ ref('fct_match') }} m
        where m.is_completed and d.current_espn_team_id in (m.home_espn_team_id, m.away_espn_team_id)
        order by m.kickoff_utc desc limit 10
    ) lm on true
),
last5 as (
    select l.player_key,
           count(*) filter (where l.rn <= 5 and f.is_starter)            as starts_last5,
           count(*) filter (where l.rn <= 5)                             as team_matches_last5,
           count(*) filter (where l.rn between 6 and 10 and f.is_starter) as starts_prev5,
           count(*) filter (where l.rn between 6 and 10)                  as team_matches_prev5
    from last10 l
    left join {{ ref('fct_player_match_stats') }} f on f.match_key = l.match_key and f.player_key = l.player_key
    group by l.player_key
),
reasons as (
    select
        d.player_key,
        array_remove(array[
            case when d.is_abroad then 'abroad' end,
            case when d.age <= 22 and coalesce(s.starts, 0) >= 1 then 'u23_regular' end,
            case when d.has_arg_senior_cap or d.has_arg_youth_cap then 'capped' end,
            case when not d.is_abroad and rm.minutes_rank <= 5 and coalesce(s.minutes, 0) > 0 then 'top_minutes_position' end,
            case when l5.starts_last5 >= 3 and coalesce(l5.starts_prev5, 0) <= 1 and l5.team_matches_prev5 >= 3 then 'rising_starter' end
        ], null) as reasons
    from d
    left join season s using (player_key)
    left join ranked_minutes rm using (player_key)
    left join last5 l5 using (player_key)
)
select
    d.player_key, d.full_name, d.age, d.primary_position, pg.pos_group,
    d.current_team_name, d.current_league, d.current_competition, d.is_abroad,
    d.eligibility_status, d.has_arg_senior_cap, d.has_arg_youth_cap,
    s.appearances, s.starts, s.minutes, s.goals, s.assists, s.xg, s.xa,
    l5.starts_last5, l5.team_matches_last5, l5.starts_prev5, l5.team_matches_prev5,
    rm.minutes_rank as minutes_rank_in_position,
    r.reasons,
    cardinality(r.reasons) > 0 as in_focus
from d
join pos_group pg using (player_key)
join reasons r using (player_key)
left join season s using (player_key)
left join ranked_minutes rm using (player_key)
left join last5 l5 using (player_key)
