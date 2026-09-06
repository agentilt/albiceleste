{#- The product's default feed: recent events for players in the focus set, most important first. -#}
select
    e.event_date, e.severity, e.event_type, e.headline,
    d.full_name, d.age, d.primary_position, d.current_team_name, d.current_league, d.current_country,
    d.eligibility_status, d.has_arg_senior_cap,
    fs.reasons as focus_reasons,
    e.evidence, e.player_key, e.match_key, e.event_key
from {{ ref('player_events') }} e
join {{ ref('dim_player') }} d using (player_key)
left join {{ ref('player_focus_set') }} fs using (player_key)
where coalesce(fs.in_focus, d.is_abroad, false)
  and e.event_date >= {{ data_horizon() }} - 60
order by e.event_date desc, e.severity desc
