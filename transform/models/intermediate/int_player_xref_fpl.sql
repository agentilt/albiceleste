{#- FPL element -> canonical player, by identical DOB + compatible name. -#}
with p as (select player_key, name_norm, dob from {{ ref('int_players') }} where dob is not null),
f as (select element_id, name_norm, dob from {{ ref('stg_fpl__elements') }} where dob is not null),
cand as (
    select f.element_id, p.player_key, {{ name_score('f.name_norm', 'p.name_norm') }} as score
    from f join p on p.dob = f.dob
    where {{ names_compatible('f.name_norm', 'p.name_norm') }}
)
select element_id, player_key, score from (
    select *, row_number() over (partition by element_id order by score desc) rn_f,
              row_number() over (partition by player_key order by score desc) rn_p
    from cand
) x where rn_f = 1 and rn_p = 1
