{#- Canonical player table for the tracked population:
      A. everyone Wikidata says is eligible/review/youth_only
      B. ESPN roster players with Argentine citizenship not resolved to Wikidata
      C. football-data.org squad players with Argentine nationality not resolved to Wikidata or ESPN
    player_key = Wikidata QID when known, else 'espn:<id>', else 'fd:<id>'. -#}
with w as (select * from {{ ref('int_wikidata_eligibility') }}),
xe as (select * from {{ ref('int_player_xref_espn') }}),
xf as (select * from {{ ref('int_player_xref_fd') }}),
espn as (select * from {{ ref('int_espn_squad_current') }} where is_primary_roster),

a as (
    select
        w.wikidata_qid                       as player_key,
        w.wikidata_qid,
        xe.athlete_id                        as espn_athlete_id,
        xf.fd_person_id,
        w.full_name, w.name_norm, w.dob, w.citizenships, w.positions, w.place_of_birth, w.height_cm,
        w.transfermarkt_id, w.fbref_id, w.soccerway_id,
        w.is_argentine_citizen, w.has_arg_senior_cap, w.has_arg_youth_cap, w.has_other_senior_cap, w.other_senior_teams,
        w.first_arg_senior_cap_date, w.eligibility_status, w.eligibility_basis,
        'wikidata'                           as identity_source
    from w
    left join xe on xe.wikidata_qid = w.wikidata_qid
    left join (select wikidata_qid, min(fd_person_id) fd_person_id from xf where wikidata_qid is not null group by 1) xf on xf.wikidata_qid = w.wikidata_qid
),
b as (
    select
        'espn:' || e.athlete_id              as player_key,
        null::text                           as wikidata_qid,
        e.athlete_id                         as espn_athlete_id,
        (select min(fd_person_id) from xf where xf.espn_athlete_id = e.athlete_id and xf.wikidata_qid is null) as fd_person_id,
        e.full_name, e.name_norm, e.dob,
        array['Argentina']::text[]           as citizenships,
        array_remove(array[e.position_name], null)::text[] as positions,
        e.birth_country                      as place_of_birth,
        null::numeric                        as height_cm,
        null::text as transfermarkt_id, null::text as fbref_id, null::text as soccerway_id,
        true as is_argentine_citizen, false as has_arg_senior_cap, false as has_arg_youth_cap, false as has_other_senior_cap,
        null::text as other_senior_teams, null::date as first_arg_senior_cap_date,
        'eligible'                           as eligibility_status,
        'citizenship_espn'                   as eligibility_basis,
        'espn'                               as identity_source
    from espn e
    where e.citizenship = 'Argentina'
      and not exists (select 1 from xe where xe.athlete_id = e.athlete_id)
),
c as (
    select
        'fd:' || f.fd_person_id              as player_key,
        null::text                           as wikidata_qid,
        null::text                           as espn_athlete_id,
        f.fd_person_id,
        f.full_name, {{ norm_name('f.full_name') }} as name_norm, f.dob,
        array['Argentina']::text[]           as citizenships,
        array[]::text[]                      as positions,
        null::text as place_of_birth, null::numeric as height_cm,
        null::text as transfermarkt_id, null::text as fbref_id, null::text as soccerway_id,
        true, false, false, false, null::text, null::date,
        'eligible', 'nationality_fd', 'fd'
    from xf f
    where f.nationality = 'Argentina' and f.wikidata_qid is null and f.espn_athlete_id is null
)
select * from a
union all select * from b
union all select * from c
