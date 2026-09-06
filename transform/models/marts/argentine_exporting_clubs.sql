select
    from_club_id, from_club_name,
    count(*)                                          as players_exported,
    count(*) filter (where transfer_year >= 2016)     as exported_last_10y,
    count(*) filter (where to_confederation = 'europa') as to_europe,
    round(avg(age_at_export), 1)                      as avg_age_at_export,
    sum(transfer_fee_eur)                             as total_fees_eur
from {{ ref('argentine_export_pipeline') }}
group by 1, 2
order by players_exported desc
