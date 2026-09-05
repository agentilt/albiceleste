{#- Senior-team eligibility derived from Wikidata evidence.
    eligible   : Argentine citizen or Argentina senior cap, and no senior spell for another nation
    review     : has a senior national-team spell for another nation (Wikidata cannot tell friendlies from competitive caps)
    youth_only : only Argentina youth spells and no recorded Argentine citizenship (usually missing data) -#}
with players as (
    select * from {{ ref('stg_wikidata__players') }}
    where coalesce(gender, 'male') = 'male'
),
memberships as (
    select
        *,
        (is_national_team or team_name ~* 'national .*team') as is_nt
    from {{ ref('stg_wikidata__memberships') }}
),
flags as (
    select
        wikidata_qid,
        bool_or(is_nt and is_argentina and not is_youth and not is_women)         as has_arg_senior_cap,
        bool_or(is_nt and is_argentina and is_youth and not is_women)             as has_arg_youth_cap,
        bool_or(is_nt and not is_argentina and not is_youth and not is_women)     as has_other_senior_cap,
        string_agg(distinct case when is_nt and not is_argentina and not is_youth and not is_women then team_name end, '; ') as other_senior_teams,
        min(case when is_nt and is_argentina and not is_youth then start_date end) as first_arg_senior_cap_date,
        count(*) filter (where not is_nt)                                          as n_club_spells
    from memberships
    group by wikidata_qid
)
select
    p.*,
    'Argentina' = any(p.citizenships)                          as is_argentine_citizen,
    coalesce(f.has_arg_senior_cap, false)                      as has_arg_senior_cap,
    coalesce(f.has_arg_youth_cap, false)                       as has_arg_youth_cap,
    coalesce(f.has_other_senior_cap, false)                    as has_other_senior_cap,
    f.other_senior_teams,
    f.first_arg_senior_cap_date,
    coalesce(f.n_club_spells, 0)                               as n_club_spells,
    case
        when coalesce(f.has_other_senior_cap, false)                                          then 'review'
        when 'Argentina' = any(p.citizenships) or coalesce(f.has_arg_senior_cap, false)       then 'eligible'
        else 'youth_only'
    end                                                        as eligibility_status,
    case
        when coalesce(f.has_arg_senior_cap, false) then 'senior_cap'
        when 'Argentina' = any(p.citizenships)     then 'citizenship'
        else 'youth_cap'
    end                                                        as eligibility_basis
from players p
left join flags f using (wikidata_qid)
