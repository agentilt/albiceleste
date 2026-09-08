{#- One row per eligible player at the data horizon: score components, rank, arrow since the last squad announcement,
    the state word, and the infirmary facts. Precedence: infirmary > just moved > back > on fire > rising > declining
    > short of minutes > established. Every number comes from score_thresholds. -#}
with h as (select {{ data_horizon() }} as horizon),
arrow_date as (
    select coalesce(
        (select max(as_of) from {{ ref('int_score_dates') }}, h where is_window and as_of < h.horizon),
        (select max(as_of) from {{ ref('int_score_dates') }}, h where as_of <= h.horizon - ({{ threshold('arrow_default_days') }})::int)
    ) as as_of
),
now_rank as (select * from {{ ref('player_rank_history') }} where is_horizon),
prev_rank as (select player_key, pos_rank as prev_rank from {{ ref('player_rank_history') }} r where r.as_of = (select as_of from arrow_date)),
d as (
    select player_key, full_name, current_espn_team_id, current_team_name, current_league, is_injured, injury_status, in_tracked_squad, eligibility_status, is_abroad,
           {{ pos_group('primary_position') }} as pos_group_from_profile
    from {{ ref('dim_player') }}
),
last_app as (
    select f.player_key, max(f.match_date) as last_match_date,
           (array_agg(f.espn_team_id order by f.match_date desc))[1] as last_team_id,
           (array_agg(f.red_cards order by f.match_date desc))[1]    as red_cards_last
    from {{ ref('fct_player_match_stats') }} f
    where f.played
    group by 1
),
-- team matches since the player's last appearance, counted for his CURRENT club (a new signing is measured against the club he joined)
missed as (
    select la.player_key,
           count(m.match_key) as team_matches_missed
    from last_app la
    join d on d.player_key = la.player_key
    join {{ ref('fct_match') }} m
      on coalesce(d.current_espn_team_id, la.last_team_id) in (m.home_espn_team_id, m.away_espn_team_id) and m.is_completed and m.match_date > la.last_match_date
    group by 1
),
pre_absence as (
    select la.player_key, s.minutes_share as pre_minutes_share
    from last_app la
    join lateral (
        select minutes_share from {{ ref('int_player_score') }} s2
        where s2.player_key = la.player_key and s2.as_of <= la.last_match_date
        order by s2.as_of desc limit 1
    ) s on true
),
recent_events as (
    select player_key,
           bool_or(event_type = 'club_change' and event_date > h.horizon - ({{ threshold('just_moved_days') }})::int) as just_moved,
           bool_or(event_type = 'return_after_absence' and event_date > h.horizon - ({{ threshold('back_days') }})::int) as came_back
    from {{ ref('player_events') }}, h
    group by 1
),
nt as (select player_key, status as nt_status, since as nt_since from {{ ref('int_nt_status') }} where player_key is not null),
watch as (select player_key, in_watch_now from {{ ref('int_watch') }}),
last_list as (
    select c.player_key, c.status as last_list_status, w.window_id as last_list_window
    from {{ ref('int_squad_calls') }} c
    join {{ ref('fifa_windows') }} w using (window_id)
    where w.announcement_date = (select max(announcement_date) from {{ ref('fifa_windows') }}, h where announcement_date <= h.horizon)
),
base as (
    select d.player_key, d.full_name, nt.nt_status, nt.nt_since, (ll.player_key is not null) as in_last_squad, coalesce(r.in_watch, w.in_watch_now, false) as in_watch, ll.last_list_status, ll.last_list_window, d.current_team_name, d.current_league, d.in_tracked_squad, d.eligibility_status, d.is_abroad,
           coalesce(r.pos_group, d.pos_group_from_profile) as pos_group, r.score, r.score_prev, r.pos_rank, r.pos_size, pr.prev_rank,
           r.minutes_share, r.starts_share, r.competition, r.production, r.team_matches,
           la.last_match_date, coalesce(mi.team_matches_missed, 0) as team_matches_missed,
           d.is_injured, d.injury_status,
           (la.red_cards_last > 0 and coalesce(mi.team_matches_missed, 0) = 0) as suspended,
           (not coalesce(d.is_injured, false)
            and not coalesce(re.just_moved, false)
            and coalesce(mi.team_matches_missed, 0) >= {{ threshold('absent_team_matches') }}
            and coalesce(pa.pre_minutes_share, 0) >= {{ threshold('short_minutes_share') }}) as absent,
           coalesce(re.just_moved, false) as just_moved,
           coalesce(re.came_back, false) as came_back
    from d
    left join now_rank r using (player_key)
    left join prev_rank pr using (player_key)
    left join last_app la using (player_key)
    left join missed mi using (player_key)
    left join pre_absence pa using (player_key)
    left join recent_events re using (player_key)
    left join nt using (player_key)
    left join last_list ll using (player_key)
    left join watch w using (player_key)
    where d.eligibility_status in ('eligible', 'review') and d.in_tracked_squad
)
select b.*,
       case when b.prev_rank is not null and b.pos_rank is not null then b.prev_rank - b.pos_rank end as rank_change,
       case
           when b.is_injured then 'injured'
           when b.suspended  then 'suspended'
           when b.absent     then 'absent'
       end as infirmary_reason,
       case
           when b.nt_status = 'retired' then 'retired'
           when b.is_injured or b.suspended or b.absent then 'out'
           when b.just_moved then 'just_moved'
           when b.came_back  then 'back'
           when b.pos_group is null or b.pos_group = 'UNK' then 'no_position'
           when b.score is null and b.last_match_date is null then 'no_minutes'
           when b.score is null then 'short_minutes'
           when b.score >= {{ threshold('on_fire_score') }} and b.score - coalesce(b.score_prev, b.score) >= {{ threshold('rising_delta') }} then 'on_fire'
           when b.score - coalesce(b.score_prev, b.score) >= {{ threshold('rising_delta') }} then 'rising'
           when b.score - coalesce(b.score_prev, b.score) <= -{{ threshold('rising_delta') }} then 'declining'
           when coalesce(b.minutes_share, 0) < {{ threshold('short_minutes_share') }} then 'short_minutes'
           when b.score >= {{ threshold('established_score') }} then 'established'
           else 'steady'
       end as state
from base b
