{#- Rank within position group at every anchor date, among eligible players with a score, plus the score at the
    nearest anchor at least form_delta_days earlier (drives the state words). -#}
{#- The ranked population is the current pool: tracked-squad players who have not retired from the national team.
    Ranking history is computed for that population at every date, so an arrow always compares like with like. -#}
with pool as (
    select d.player_key from {{ ref('dim_player') }} d
    where d.in_tracked_squad and d.eligibility_status in ('eligible', 'review')
      and not exists (select 1 from {{ ref('int_nt_status') }} n where n.player_key = d.player_key and n.status = 'retired')
),
s as (select p.* from {{ ref('int_player_score') }} p join pool using (player_key) where p.score is not null),
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
       s.minutes_share, s.starts_share, s.competition, s.production, s.level_rank, s.team_id, s.last_match_date,
       rank() over (partition by s.pos_group, s.as_of order by s.score desc, s.minutes desc, s.player_key) as pos_rank,
       count(*)  over (partition by s.pos_group, s.as_of)                                                 as pos_size
from s
join {{ ref('int_score_dates') }} d using (as_of)
join prev using (player_key, as_of)
