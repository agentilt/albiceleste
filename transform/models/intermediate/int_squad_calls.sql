{#- Squad-list rows from the hand-kept seed resolved to player keys: an explicit player_key in the seed wins; otherwise
    the unaccented name must match a known eligible player exactly, else surname plus first-name initial with a unique hit.
    Unresolved rows are kept with a null key so they show up in data quality. -#}
with calls as (
    select window_id, player_name, club_at_call, pos_group, status, nullif(player_key, '') as pinned_key,
           {{ norm_name('player_name') }} as name_norm
    from {{ ref('squad_calls') }}
),
players as (
    select player_key, full_name, source_name,
           {{ norm_name('full_name') }} as full_norm,
           {{ norm_name("coalesce(source_name, full_name)") }} as source_norm
    from {{ ref('dim_player') }}
    where eligibility_status in ('eligible', 'review')
),
exact as (
    select c.window_id, c.player_name, p.player_key,
           row_number() over (partition by c.window_id, c.player_name order by p.player_key) as rn,
           count(*) over (partition by c.window_id, c.player_name) as hits
    from calls c
    join players p on p.full_norm = c.name_norm or p.source_norm = c.name_norm
),
loose as (
    select c.window_id, c.player_name, p.player_key,
           count(*) over (partition by c.window_id, c.player_name) as hits
    from calls c
    join players p
      on {{ last_token('p.full_norm') }} = {{ last_token('c.name_norm') }}
     and left({{ first_token('p.full_norm') }}, 1) = left({{ first_token('c.name_norm') }}, 1)
)
select c.window_id, c.player_name, c.club_at_call, c.pos_group, c.status,
       coalesce(c.pinned_key,
                (select player_key from exact e where e.window_id = c.window_id and e.player_name = c.player_name and e.hits = 1),
                (select min(player_key) from loose l where l.window_id = c.window_id and l.player_name = c.player_name and l.hits = 1)) as player_key,
       case when c.pinned_key is not null then 'pinned'
            when exists (select 1 from exact e where e.window_id = c.window_id and e.player_name = c.player_name and e.hits = 1) then 'exact'
            when exists (select 1 from loose l where l.window_id = c.window_id and l.player_name = c.player_name and l.hits = 1) then 'loose'
            else 'unresolved' end as resolution
from calls c
