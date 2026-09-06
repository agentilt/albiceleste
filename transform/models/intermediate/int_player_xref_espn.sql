{#- ESPN athlete -> Wikidata QID. Direct ESPN id on Wikidata wins; otherwise identical date of birth plus a
    compatible name (surname + given name). Year-precision Wikidata DOBs (Jan 1) need a near-exact name.
    One-to-one enforced by mutual best rank. Precision matters more than recall: an unresolved Argentine
    still enters the population under an 'espn:' key, while a wrong merge corrupts two players. -#}
with e as (
    select distinct athlete_id, full_name, name_norm, dob, citizenship from {{ ref('int_espn_athletes') }}
),
w as (
    select wikidata_qid, name_norm, dob, espn_id,
           (extract(month from dob) = 1 and extract(day from dob) = 1) as dob_is_year_only
    from {{ ref('int_wikidata_eligibility') }}
),
direct as (
    select e.athlete_id, w.wikidata_qid, 1.0::real as score, 'espn_id_on_wikidata' as method
    from e join w on w.espn_id = e.athlete_id
),
cand as (
    select
        e.athlete_id, w.wikidata_qid,
        {{ name_score('e.name_norm', 'w.name_norm') }} as score,
        {{ names_compatible('e.name_norm', 'w.name_norm') }} as compatible,
        w.dob_is_year_only
    from e
    join w on w.dob = e.dob
    where e.dob is not null
),
filtered as (
    select athlete_id, wikidata_qid, score, 'dob_and_name' as method
    from cand
    where compatible and (not dob_is_year_only or score >= 0.7)
),
unioned as (
    select * from direct
    union all
    select f.* from filtered f where not exists (select 1 from direct d where d.athlete_id = f.athlete_id)
),
ranked as (
    select *,
        row_number() over (partition by athlete_id order by score desc)   as rn_a,
        row_number() over (partition by wikidata_qid order by score desc) as rn_w
    from unioned
)
select athlete_id, wikidata_qid, score, method
from ranked
where rn_a = 1 and rn_w = 1
