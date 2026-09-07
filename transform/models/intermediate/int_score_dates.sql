{#- Anchor dates at which the ranking score is computed: every Monday from the start of the history, every squad
    announcement date, and the data horizon. -#}
with h as (select {{ data_horizon() }} as horizon),
weekly as (
    select g.d::date as as_of, 'weekly' as kind
    from h, generate_series(date '2024-08-05', h.horizon, interval '7 days') as g(d)
),
windows as (
    select announcement_date::date as as_of, 'window' as kind
    from {{ ref('fifa_windows') }}, h
    where announcement_date::date <= h.horizon
),
horizon as (select horizon as as_of, 'horizon' as kind from h),
all_dates as (
    select * from weekly union all select * from windows union all select * from horizon
)
select as_of,
       bool_or(kind = 'window')  as is_window,
       bool_or(kind = 'horizon') as is_horizon
from all_dates
group by 1
