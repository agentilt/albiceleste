{#- Hand-kept under-20 and under-23 tournament dates for the Next cycle masthead. -#}
select event_id, label_es, label_en, starts, ends, status, note from {{ ref('youth_calendar') }} order by starts
