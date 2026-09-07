{#- Hand-kept national-team statuses (retirements) resolved to player keys the same way squad calls are. -#}
with rows_ as (
    select player_name, status, since, source, nullif(player_key, '') as pinned_key, {{ norm_name('player_name') }} as name_norm
    from {{ ref('national_team_status') }}
),
players as (
    select player_key, {{ norm_name('full_name') }} as full_norm, {{ norm_name("coalesce(source_name, full_name)") }} as source_norm
    from {{ ref('dim_player') }} where eligibility_status in ('eligible', 'review')
),
exact as (
    select r.player_name, p.player_key, count(*) over (partition by r.player_name) as hits
    from rows_ r join players p on p.full_norm = r.name_norm or p.source_norm = r.name_norm
)
select r.player_name, r.status, r.since, r.source,
       coalesce(r.pinned_key, (select min(player_key) from exact e where e.player_name = r.player_name and e.hits = 1)) as player_key
from rows_ r
