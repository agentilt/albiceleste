{#- football-data.org person -> Wikidata QID and -> ESPN athlete, by identical DOB + compatible name. -#}
with f as (
    select distinct fd_person_id, full_name, name_norm, dob, nationality from {{ ref('stg_fd__squad_players') }}
    where dob is not null
),
w as (
    select wikidata_qid, name_norm, dob, (extract(month from dob) = 1 and extract(day from dob) = 1) as dob_is_year_only
    from {{ ref('int_wikidata_eligibility') }} where dob is not null
),
e as (select distinct athlete_id, name_norm, dob from {{ ref('int_espn_athletes') }} where dob is not null),
to_w as (
    select f.fd_person_id, w.wikidata_qid, {{ name_score('f.name_norm', 'w.name_norm') }} as score
    from f join w on w.dob = f.dob
    where {{ names_compatible('f.name_norm', 'w.name_norm') }}
      and (not w.dob_is_year_only or {{ name_score('f.name_norm', 'w.name_norm') }} >= 0.7)
),
to_e as (
    select f.fd_person_id, e.athlete_id, {{ name_score('f.name_norm', 'e.name_norm') }} as score
    from f join e on e.dob = f.dob
    where {{ names_compatible('f.name_norm', 'e.name_norm') }}
),
best_w as (
    select fd_person_id, wikidata_qid, score from (
        select *, row_number() over (partition by fd_person_id order by score desc) rn_f,
                  row_number() over (partition by wikidata_qid order by score desc) rn_w
        from to_w
    ) x where rn_f = 1 and rn_w = 1
),
best_e as (
    select fd_person_id, athlete_id, score from (
        select *, row_number() over (partition by fd_person_id order by score desc) rn_f,
                  row_number() over (partition by athlete_id order by score desc) rn_e
        from to_e
    ) x where rn_f = 1 and rn_e = 1
)
select f.fd_person_id, f.full_name, f.dob, f.nationality, bw.wikidata_qid, bw.score as wikidata_score, be.athlete_id as espn_athlete_id, be.score as espn_score
from f
left join best_w bw using (fd_person_id)
left join best_e be using (fd_person_id)
