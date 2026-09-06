{#- Canonical player -> Transfermarkt player. Direct via the Transfermarkt id Wikidata stores; otherwise
    Argentine TM players by identical DOB + compatible name (mutual best). -#}
with p as (select player_key, name_norm, dob, transfermarkt_id from {{ ref('int_players') }}),
tm as (select tm_player_id, name_norm, dob, country_of_citizenship from {{ ref('stg_tm__players') }}),
direct as (
    select p.player_key, tm.tm_player_id, 1.0 as score, 'wikidata_tm_id' as method
    from p join tm on tm.tm_player_id::text = p.transfermarkt_id
),
cand as (
    select p.player_key, tm.tm_player_id, {{ name_score('p.name_norm', 'tm.name_norm') }} as score, 'dob_and_name' as method
    from p join tm on tm.dob = p.dob
    where p.dob is not null and tm.country_of_citizenship = 'Argentina'
      and {{ names_compatible('p.name_norm', 'tm.name_norm') }}
      and not exists (select 1 from direct d where d.player_key = p.player_key)
      and not exists (select 1 from direct d where d.tm_player_id = tm.tm_player_id)
),
fallback as (
    select player_key, tm_player_id, score, method from (
        select *, row_number() over (partition by player_key order by score desc) rn_p,
                  row_number() over (partition by tm_player_id order by score desc) rn_t
        from cand
    ) x where rn_p = 1 and rn_t = 1
),
unioned as (select * from direct union all select * from fallback),
deduped as (
    select * from (
        select *, row_number() over (partition by player_key order by (method = 'wikidata_tm_id') desc, score desc) rn_p,
                  row_number() over (partition by tm_player_id order by (method = 'wikidata_tm_id') desc, score desc) rn_t
        from unioned
    ) x where rn_p = 1 and rn_t = 1
)
select player_key, tm_player_id, score, method from deduped
