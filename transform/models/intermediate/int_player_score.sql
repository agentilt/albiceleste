{#- The ranking score per eligible player at every anchor date, from the player's team's last N completed matches as of
    that date. Components in [0, 1]; weights per position group from score_weights; every number in score_thresholds.
    The score is never displayed: it orders the pool and drives the state words. -#}
{{ config(indexes=[{'columns': ['player_key', 'as_of']}]) }}
with dates as (select as_of from {{ ref('int_score_dates') }}),
players as (
    select d.player_key, d.current_espn_team_id, {{ pos_group('d.primary_position') }} as pos_group
    from {{ ref('dim_player') }} d
    where d.eligibility_status in ('eligible', 'review')
      and (d.in_tracked_squad or exists (select 1 from {{ ref('fct_player_match_stats') }} f where f.player_key = d.player_key))
      and not exists (select 1 from {{ ref('int_nt_status') }} n where n.player_key = d.player_key and n.status = 'retired')
),
f as (
    select player_key, match_key, match_date, espn_team_id, is_starter, played, minutes_played, goals, assists
    from {{ ref('fct_player_match_stats') }}
),
m as (
    select match_key, match_date, home_espn_team_id, away_espn_team_id, home_score, away_score, competition_level_rank
    from {{ ref('fct_match') }} where is_completed
),
-- spells: a new spell starts whenever the player's match team changes; spell_start is its first match.
-- The scoring window only counts team matches from the spell start, so a summer signing is not scored on matches he was not at.
seq0 as (
    select player_key, match_key, match_date, espn_team_id,
           case when espn_team_id is distinct from lag(espn_team_id) over (partition by player_key order by match_date, match_key) then 1 else 0 end as new_spell
    from f where espn_team_id is not null
),
seq as (
    select player_key, match_date, espn_team_id,
           sum(new_spell) over (partition by player_key order by match_date, match_key rows unbounded preceding) as spell_id
    from seq0
),
spells as (
    select player_key, spell_id, espn_team_id as team_id, min(match_date) as spell_start
    from seq group by 1, 2, 3
),
-- the team the player belongs to as of each date: the team of his last match at or before it (with its spell), else his current club
last_team as (
    select p.player_key, dt.as_of,
           (array_agg(s.espn_team_id order by s.match_date desc))[1] as team_id,
           (array_agg(s.spell_id order by s.match_date desc))[1]     as spell_id,
           max(s.match_date) as last_match_date
    from players p
    cross join dates dt
    join seq s on s.player_key = p.player_key and s.match_date <= dt.as_of
    group by 1, 2
),
team_asof as (
    select p.player_key, p.pos_group, dt.as_of,
           coalesce(lt.team_id, case when dt.as_of >= {{ data_horizon() }} - 60 then p.current_espn_team_id end) as team_id,
           lt.last_match_date,
           sp.spell_start
    from players p
    cross join dates dt
    left join last_team lt on lt.player_key = p.player_key and lt.as_of = dt.as_of
    left join spells sp on sp.player_key = lt.player_key and sp.spell_id = lt.spell_id
),
team_window as (
    select ta.player_key, ta.pos_group, ta.as_of, ta.team_id, ta.last_match_date, ta.spell_start,
           m.match_key, m.match_date, m.competition_level_rank,
           case when m.home_espn_team_id = ta.team_id then m.away_score else m.home_score end as conceded,
           row_number() over (partition by ta.player_key, ta.as_of order by m.match_date desc) as rn
    from team_asof ta
    join m on ta.team_id in (m.home_espn_team_id, m.away_espn_team_id)
          and m.match_date <= ta.as_of and m.match_date > ta.as_of - 150 and m.match_date >= ta.spell_start
    where ta.team_id is not null and ta.spell_start is not null
),
tw as (select * from team_window where rn <= {{ threshold('window_matches') }}),
agg as (
    select tw.player_key, tw.pos_group, tw.as_of, tw.team_id, tw.last_match_date, tw.spell_start,
           count(*)                                                        as team_matches,
           (array_agg(tw.competition_level_rank order by tw.match_date desc))[1] as level_rank,
           count(f.match_key) filter (where f.played)                       as apps,
           count(f.match_key) filter (where f.is_starter)                   as starts,
           coalesce(sum(f.minutes_played), 0)                               as minutes,
           coalesce(sum(f.goals), 0)                                        as goals,
           coalesce(sum(f.assists), 0)                                      as assists,
           count(f.match_key) filter (where f.played and tw.conceded = 0)   as clean_sheets,
           coalesce(sum(tw.conceded) filter (where f.played), 0)            as conceded_in_apps,
           coalesce(sum(f.minutes_played) filter (where f.played), 0)       as minutes_in_apps
    from tw
    left join f on f.player_key = tw.player_key and f.match_key = tw.match_key
    group by 1, 2, 3, 4, 5, 6
),
components as (
    select a.*,
           least(1.0, a.minutes::numeric / nullif(a.team_matches * 90, 0))            as minutes_share,
           least(1.0, a.starts::numeric / nullif(a.team_matches, 0))                   as starts_share,
           case a.level_rank
               when 1 then {{ threshold('competition_weight_rank1') }}
               when 2 then {{ threshold('competition_weight_rank2') }}
               else {{ threshold('competition_weight_rank3') }}
           end                                                                          as competition,
           case
               when a.pos_group in ('MID', 'FWD') then
                   least(1.0, ((a.goals + 0.7 * a.assists) * 90.0 / nullif(a.minutes, 0))
                              / case when a.pos_group = 'FWD' then {{ threshold('production_ref_fwd') }} else {{ threshold('production_ref_mid') }} end)
               when a.apps > 0 then
                   0.6 * (a.clean_sheets::numeric / a.apps)
                   + 0.4 * greatest(0.0, 1.0 - (a.conceded_in_apps * 90.0 / nullif(a.minutes_in_apps, 0)) / {{ threshold('conceded_ref') }})
               else 0.0
           end                                                                          as production
    from agg a
),
weighted as (
    select c.*,
           case when c.team_matches >= {{ threshold('min_team_matches') }} and c.pos_group <> 'UNK' then
               round((100 * c.competition * (
                   coalesce(c.minutes_share, 0) * (select weight from {{ ref('score_weights') }} w where w.pos_group = c.pos_group and w.component = 'minutes_share')
                 + coalesce(c.starts_share, 0)  * (select weight from {{ ref('score_weights') }} w where w.pos_group = c.pos_group and w.component = 'starts_share')
                 + coalesce(c.production, 0)     * (select weight from {{ ref('score_weights') }} w where w.pos_group = c.pos_group and w.component = 'production')
               ))::numeric, 1)
           end as score
    from components c
)
select * from weighted
