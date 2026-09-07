{#- The hand-kept FIFA windows with the size of each published list, for the countdown line and the call-up strips. -#}
with calls as (
    select window_id, count(*) as listed, count(player_key) as resolved
    from {{ ref('int_squad_calls') }} group by 1
)
select w.window_id, w.label_es, w.label_en, w.starts, w.ends, w.max_matches, w.announcement_date, w.announcement_status,
       w.matches_note, w.source, coalesce(c.listed, 0) as listed, coalesce(c.resolved, 0) as resolved
from {{ ref('fifa_windows') }} w
left join calls c using (window_id)
order by w.starts
