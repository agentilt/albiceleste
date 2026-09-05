{#- ESPN event <-> Highlightly match (same league, same home team via team xref, kickoff within 1 day)
    and <-> football-data.org match. -#}
with ev as (select * from {{ ref('stg_espn__events') }}),
tx as (select * from {{ ref('int_team_xref') }}),
hl as (select * from {{ ref('stg_highlightly__matches') }}),
fd as (select * from {{ ref('stg_fd__matches') }}),
hl_join as (
    select ev.event_id, hl.hl_match_id,
           abs(extract(epoch from (hl.kickoff_utc - ev.kickoff_utc))) as dt,
           row_number() over (partition by ev.event_id order by abs(extract(epoch from (hl.kickoff_utc - ev.kickoff_utc)))) rn_e,
           row_number() over (partition by hl.hl_match_id order by abs(extract(epoch from (hl.kickoff_utc - ev.kickoff_utc)))) rn_h
    from ev
    join tx th on th.league = ev.league and th.espn_team_id = ev.home_team_id
    join tx ta on ta.league = ev.league and ta.espn_team_id = ev.away_team_id
    join hl on hl.league = ev.league and hl.home_team_id = th.hl_team_id and hl.away_team_id = ta.hl_team_id
           and hl.kickoff_utc between ev.kickoff_utc - interval '36 hours' and ev.kickoff_utc + interval '36 hours'
),
fd_join as (
    select ev.event_id, fd.fd_match_id,
           row_number() over (partition by ev.event_id order by abs(extract(epoch from (fd.kickoff_utc - ev.kickoff_utc)))) rn_e,
           row_number() over (partition by fd.fd_match_id order by abs(extract(epoch from (fd.kickoff_utc - ev.kickoff_utc)))) rn_f
    from ev
    join tx th on th.league = ev.league and th.espn_team_id = ev.home_team_id
    join tx ta on ta.league = ev.league and ta.espn_team_id = ev.away_team_id
    join fd on fd.home_team_id = th.fd_team_id and fd.away_team_id = ta.fd_team_id
           and fd.kickoff_utc between ev.kickoff_utc - interval '36 hours' and ev.kickoff_utc + interval '36 hours'
)
select ev.event_id, h.hl_match_id, f.fd_match_id
from ev
left join hl_join h on h.event_id = ev.event_id and h.rn_e = 1 and h.rn_h = 1
left join fd_join f on f.event_id = ev.event_id and f.rn_e = 1 and f.rn_f = 1
