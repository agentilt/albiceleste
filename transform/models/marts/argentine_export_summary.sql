select
    transfer_year,
    to_country,
    count(*)                                          as players_exported,
    round(avg(age_at_export), 1)                      as avg_age_at_export,
    percentile_cont(0.5) within group (order by age_at_export) as median_age_at_export,
    sum(transfer_fee_eur)                             as total_fees_eur,
    count(*) filter (where transfer_fee_eur > 0)      as paid_transfers
from {{ ref('argentine_export_pipeline') }}
where transfer_year >= 2000
group by 1, 2
