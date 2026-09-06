{#- Club-to-club moves for tracked players, from the Transfermarkt snapshot (frozen 2026-07-06). -#}
with x as (select * from {{ ref('int_player_xref_tm') }}),
t as (select * from {{ ref('stg_tm__transfers') }}),
c as (select * from {{ ref('stg_tm__clubs') }}),
comp as (select * from {{ ref('stg_tm__competitions') }}),
d as (select player_key, full_name, dob from {{ ref('dim_player') }})
select
    x.player_key, d.full_name,
    t.transfer_date, t.transfer_season,
    t.from_club_id, t.from_club_name, fc.tm_competition_id as from_competition_id, fcomp.competition_name as from_competition, fcomp.country_name as from_country,
    t.to_club_id, t.to_club_name, tc.tm_competition_id as to_competition_id, tcomp.competition_name as to_competition, tcomp.country_name as to_country,
    t.transfer_fee_eur, t.market_value_eur,
    case when d.dob is not null and t.transfer_date is not null then extract(year from age(t.transfer_date, d.dob))::int end as age_at_transfer,
    'transfermarkt' as source
from t
join x using (tm_player_id)
join d using (player_key)
left join c fc on fc.tm_club_id = t.from_club_id
left join c tc on tc.tm_club_id = t.to_club_id
left join comp fcomp on fcomp.tm_competition_id = fc.tm_competition_id
left join comp tcomp on tcomp.tm_competition_id = tc.tm_competition_id
