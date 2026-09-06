{#- Every Argentine (per Transfermarkt citizenship) whose first move out of an Argentine club went abroad:
    when, from where, to where, how old, for how much. Uses the whole snapshot, not only tracked players. -#}
with p as (select * from {{ ref('stg_tm__players') }} where country_of_citizenship = 'Argentina'),
t as (select * from {{ ref('stg_tm__transfers') }}),
c as (select * from {{ ref('stg_tm__clubs') }}),
comp as (select * from {{ ref('stg_tm__competitions') }}),
moves as (
    select
        t.tm_player_id, p.full_name, p.dob, p.position,
        t.transfer_date, t.transfer_season, t.from_club_id, t.from_club_name, t.to_club_id, t.to_club_name,
        t.transfer_fee_eur, t.market_value_eur,
        fcomp.country_name as from_country, tcomp.country_name as to_country, tcomp.competition_name as to_competition, tcomp.confederation as to_confederation,
        row_number() over (partition by t.tm_player_id order by t.transfer_date) as rn
    from t
    join p using (tm_player_id)
    left join c fc on fc.tm_club_id = t.from_club_id
    left join c tc on tc.tm_club_id = t.to_club_id
    left join comp fcomp on fcomp.tm_competition_id = fc.tm_competition_id
    left join comp tcomp on tcomp.tm_competition_id = tc.tm_competition_id
    where fcomp.country_name = 'Argentina'
      and (tcomp.country_name is null or tcomp.country_name <> 'Argentina')
      and t.transfer_date is not null
)
select
    tm_player_id, full_name, dob, position,
    transfer_date, extract(year from transfer_date)::int as transfer_year, transfer_season,
    from_club_id, from_club_name, to_club_id, to_club_name,
    coalesce(to_country, 'other / not covered') as to_country, to_competition, to_confederation,
    transfer_fee_eur, market_value_eur,
    case when dob is not null then extract(year from age(transfer_date, dob))::int end as age_at_export,
    x.player_key
from moves m
left join {{ ref('int_player_xref_tm') }} x using (tm_player_id)
where rn = 1
