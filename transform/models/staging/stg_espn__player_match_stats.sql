{#- One row per player listed in a match summary roster (incl. unused subs), with derived minutes. -#}
with src as ({{ latest('espn', 'summary') }}),
rosters as (
    select
        payload->>'_event_id'      as event_id,
        payload->>'_league'        as league,
        t->'team'->>'id'           as team_id,
        t->>'homeAway'             as home_away,
        r
    from src, jsonb_array_elements(payload->'rosters') t, jsonb_array_elements(coalesce(t->'roster', '[]')) r
),
parsed as (
    select
        event_id, league, team_id, home_away,
        r->'athlete'->>'id'                        as athlete_id,
        r->'athlete'->>'displayName'               as full_name,
        {{ norm_name("r->'athlete'->>'displayName'") }} as name_norm,
        r->'position'->>'abbreviation'             as position_code,
        coalesce((r->>'starter')::boolean, false)  as is_starter,
        coalesce((r->>'subbedIn')::boolean, false) as subbed_in,
        coalesce((r->>'subbedOut')::boolean, false) as subbed_out,
        nullif(r->>'formationPlace', '')::int      as formation_place,
        (select min({{ espn_minute("p->'clock'->>'displayValue'") }}) from jsonb_array_elements(coalesce(r->'plays', '[]')) p) as first_play_minute,
        (select max({{ espn_minute("p->'clock'->>'displayValue'") }}) from jsonb_array_elements(coalesce(r->'plays', '[]')) p) as last_play_minute,
        st
    from rosters
    cross join lateral (
        select jsonb_object_agg(s->>'name', s->>'value') as st from jsonb_array_elements(coalesce(r->'stats', '[]')) s
    ) sx
),
minutes as (
    select
        *,
        case when subbed_in  then first_play_minute end as sub_in_minute,
        case when subbed_out then last_play_minute  end as sub_out_minute,
        -- match length: 120 when any substitution clock in this match runs past 90 (extra time), else 90
        case when max(last_play_minute) over (partition by event_id) > 90 then 120 else 90 end as match_length
    from parsed
),
-- ESPN occasionally lists one athlete id in both teams' lineups; keep the row on the athlete's rostered team.
deduped as (
    select m.*,
           row_number() over (
               partition by m.event_id, m.athlete_id
               order by (exists (select 1 from {{ ref('stg_espn__roster_players') }} r where r.athlete_id = m.athlete_id and r.team_id = m.team_id)) desc, m.team_id
           ) as rn
    from minutes m
)
select
    event_id, league, team_id, home_away, athlete_id, full_name, name_norm, position_code,
    is_starter, subbed_in, subbed_out, sub_in_minute, sub_out_minute, formation_place,
    coalesce((st->>'appearances')::numeric, 0) >= 1                   as played,
    -- clamped to [0, 120]: substitution clocks are occasionally mis-parsed (e.g. "45'+2'" attached to the wrong player)
    greatest(0, least(120, case
        when is_starter and not subbed_out then match_length
        when is_starter and subbed_out     then sub_out_minute
        when subbed_in  and not subbed_out then match_length - sub_in_minute
        when subbed_in  and subbed_out     then sub_out_minute - sub_in_minute
        else 0
    end))                                                             as minutes_played,
    match_length,
    (st->>'totalGoals')::numeric::int                                 as goals,
    (st->>'goalAssists')::numeric::int                                as assists,
    (st->>'totalShots')::numeric::int                                 as shots,
    (st->>'shotsOnTarget')::numeric::int                              as shots_on_target,
    (st->>'yellowCards')::numeric::int                                as yellow_cards,
    (st->>'redCards')::numeric::int                                   as red_cards,
    (st->>'foulsCommitted')::numeric::int                             as fouls_committed,
    (st->>'foulsSuffered')::numeric::int                              as fouls_suffered,
    (st->>'offsides')::numeric::int                                   as offsides,
    (st->>'ownGoals')::numeric::int                                   as own_goals,
    (st->>'saves')::numeric::int                                      as saves,
    (st->>'goalsConceded')::numeric::int                              as goals_conceded
from deduped
where rn = 1
