{#- The Movers feed: every event with an importance weight (event_weights seed, plus modifiers for the last squad, a top-ten
    rank and competition tier) and the filter columns the page needs. Headlines are English templates; the site renders from
    evidence in either language. -#}
with h as (select {{ data_horizon() }} as horizon),
e as (select * from {{ ref('player_events') }}),
w as (select * from {{ ref('event_weights') }}),
s as (select * from {{ ref('player_state') }}),
d as (select player_key, full_name, dob, age, current_team_name, current_competition, current_country, is_abroad from {{ ref('dim_player') }}),
comp as (select league, level_rank from {{ ref('dim_competition') }})
select
    e.event_key, e.player_key, d.full_name, e.event_type, e.event_date, e.match_key, e.league, comp.level_rank,
    d.current_team_name, d.current_competition, d.current_country, d.is_abroad, d.age,
    s.pos_group, s.pos_rank, s.state, s.in_last_squad,
    e.severity, e.evidence, e.headline,
    case
        when e.event_type in ('minutes_drop', 'selection_left_out') then 'down'
        when e.event_type = 'rank_move' then case when (e.evidence->>'change')::int > 0 then 'up' else 'down' end
        when e.event_type = 'club_change' then case when (e.evidence->>'to_level_rank')::int < (e.evidence->>'from_level_rank')::int then 'up'
                                                    when (e.evidence->>'to_level_rank')::int > (e.evidence->>'from_level_rank')::int then 'down' else 'neutral' end
        when e.event_type in ('minutes_surge', 'scoring_streak', 'multi_goal_match', 'consecutive_starts', 'first_start_of_season', 'debut_in_league', 'return_after_absence', 'selection_called') then 'up'
        else 'neutral'
    end as direction,
    round((
        coalesce(w.base_weight, 20)
        + case when e.event_type = 'club_change' and (e.evidence->>'to_level_rank') <> (e.evidence->>'from_level_rank') then 20 else 0 end
        + case when e.event_type = 'rank_move' then least(30, abs((e.evidence->>'change')::int) * 2) else 0 end
        + case when e.event_type = 'multi_goal_match' and (e.evidence->>'goals')::int >= 3 then 15 else 0 end
        + case when e.event_type = 'scoring_streak' and (e.evidence->>'consecutive_scoring_apps')::int >= 5 then 15 else 0 end
        + case when e.event_type = 'consecutive_starts' and (e.evidence->>'consecutive_starts')::int >= 10 then 15 else 0 end
        + case when s.in_last_squad then 15 else 0 end
        + case when s.pos_rank <= 10 then 10 else 0 end
    ) * case comp.level_rank when 1 then 1.0 when 2 then 0.85 else 0.7 end, 1) as importance,
    (e.event_date >= (select horizon from h) - 7)  as in_last_7_days,
    (e.event_date >= (select horizon from h) - 28) as in_last_28_days
from e
join d using (player_key)
left join s using (player_key)
left join w on w.event_type = e.event_type
left join comp on comp.league = e.league
where (s.player_key is not null or e.event_type in ('selection_called', 'selection_left_out'))
  and not (e.event_type = 'rank_move' and s.state in ('just_moved', 'back', 'out', 'retired', 'no_minutes'))
