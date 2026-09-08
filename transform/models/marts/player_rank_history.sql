{#- Rank within position group at every anchor date, among eligible players with a score, plus the score at the
    nearest anchor at least form_delta_days earlier (drives the state words). -#}
{#- The ranked population is the watch (int_watch: a cap, a list, or a club in a watch competition as of the date) among
    tracked-squad players who have not retired. Scores exist for everyone tracked; ranks only inside the watch. -#}
with pool as (
    select d.player_key from {{ ref('dim_player') }} d
    where d.in_tracked_squad and d.eligibility_status in ('eligible', 'review')
      and not exists (select 1 from {{ ref('int_nt_status') }} n where n.player_key = d.player_key and n.status = 'retired')
),
team_league as (select espn_team_id, min(league) as league from {{ ref('dim_team') }} group by 1),
s0 as (
    select p.*, tl.league as team_league_code,
           (w.has_cap or w.in_any_list or coalesce(c.in_watch, false)) as in_watch_base,
           coalesce(c.is_argentina_domestic, false) as is_domestic
    from {{ ref('int_player_score') }} p
    join pool using (player_key)
    left join {{ ref('int_watch') }} w using (player_key)
    left join team_league tl on tl.espn_team_id = p.team_id
    left join {{ ref('dim_competition') }} c on c.league = tl.league
    where p.score is not null
),
-- the domestic ramp: the best few of the Argentine league per position enter the watch on merit, at every date
s as (
    select s0.*,
           (s0.in_watch_base
            or (s0.is_domestic
                and rank() over (partition by s0.pos_group, s0.as_of, s0.is_domestic order by s0.score desc, s0.minutes desc, s0.player_key)
                    <= {{ threshold('domestic_watch_slots') }})) as in_watch
    from s0
),
prev as (
    select s.player_key, s.as_of, p.score as score_prev
    from s
    left join lateral (
        select score from {{ ref('int_player_score') }} p2
        where p2.player_key = s.player_key and p2.score is not null
          and p2.as_of <= s.as_of - ({{ threshold('form_delta_days') }})::int
        order by p2.as_of desc limit 1
    ) p on true
)
select s.player_key, s.pos_group, s.as_of, d.is_window, d.is_horizon,
       s.score, prev.score_prev, s.team_matches, s.minutes, s.starts, s.apps, s.goals, s.assists,
       s.minutes_share, s.starts_share, s.competition, s.production, s.level_rank, s.team_id, s.last_match_date, s.in_watch,
       -- the rank is the watch's rank: everyone tracked keeps a score (the states and the trajectory use it), only the watch is ranked
       case when s.in_watch then rank() over (partition by s.pos_group, s.as_of, s.in_watch order by s.score desc, s.minutes desc, s.player_key) end as pos_rank,
       case when s.in_watch then count(*) over (partition by s.pos_group, s.as_of, s.in_watch) end                                              as pos_size
from s
join {{ ref('int_score_dates') }} d using (as_of)
join prev using (player_key, as_of)
