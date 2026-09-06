{#- Do Highlightly box-score minutes and ESPN substitution-clock minutes agree? One row, same player + same match, both present. -#}
with h as (
    select m.match_key, x.athlete_id, s.minutes_played as hl_min
    from {{ ref('stg_highlightly__player_match_stats') }} s
    join {{ ref('int_player_xref_hl') }} x using (hl_player_id)
    join {{ ref('fct_match') }} m on m.hl_match_id = s.hl_match_id
),
e as (
    select m.match_key, s.athlete_id, s.minutes_played as espn_min
    from {{ ref('stg_espn__player_match_stats') }} s
    join {{ ref('fct_match') }} m on m.espn_event_id = s.event_id
    where s.played
)
select
    count(*)                                                                                   as pairs,
    round(100.0 * count(*) filter (where abs(hl_min - espn_min) <= 3) / nullif(count(*), 0), 1) as pct_within_3_min,
    round(avg(abs(hl_min - espn_min)), 2)                                                      as mean_abs_diff,
    max(abs(hl_min - espn_min))                                                                as max_abs_diff
from h join e using (match_key, athlete_id)
