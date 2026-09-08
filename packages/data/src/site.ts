/**
 * Queries for the pages of the briefs (docs/page-briefs.md): Home, Pool, Player, Movers, Compare, Next cycle, About the data.
 * The pool is read once per build and shared; per-player calls stay small.
 */
import { manifest, one, rows } from "./db";
import type {
  AgeBand,
  ComparePlayer,
  CompareAxis,
  MethodParameter,
  MoverRow,
  PlayerCall,
  PlayerExtra,
  PoolRow,
  RankPoint,
  RoundMatch,
  RoundRow,
  RoundWeek,
  SelectionWindow,
  SquadListRow,
  TrajectoryRow,
  WeekendMatch,
  YouthEvent,
} from "./types";

export function getWindows() {
  return rows<SelectionWindow>(`select * from marts.selection_windows order by starts`);
}

export function getSquadLists() {
  return rows<SquadListRow>(
    `select window_id, announcement_date, player_name, club_at_call, pos_group, status, player_key, resolution from marts.squad_lists order by announcement_date, pos_group, player_name`,
  );
}

export function getYouthEvents() {
  return rows<YouthEvent>(`select * from marts.youth_events order by starts`);
}

export function getMethodParameters() {
  return rows<MethodParameter>(`select kind, name, value, description, pos_group, component from marts.method_parameters order by kind, name`);
}

let poolCache: Promise<PoolRow[]> | null = null;

/** Every player in the pool (tracked squad, eligible or under review) with rank, state, season line, form, next and last match. */
export function getPool(): Promise<PoolRow[]> {
  if (!poolCache) {
    poolCache = rows<PoolRow>(`
      with h as (select as_of() as horizon),
      cur_season as (select league, max(season_year) as season_year from marts.fct_match group by 1),
      team_season_matches as (
          select espn_team_id, league, count(*) as team_matches
          from (select league, season_year, unnest([home_espn_team_id, away_espn_team_id]) as espn_team_id from marts.fct_match where is_completed) t
          join cur_season using (league, season_year)
          group by 1, 2
      ),
      season as (
          select s.player_key, s.league, s.season_year, s.appearances, s.starts, s.minutes, s.goals, s.assists, s.xg, s.xa, s.avg_rating
          from marts.player_season_stats s join cur_season using (league, season_year)
      ),
      conceded as (
          select f.player_key, f.league,
                 sum(case when f.is_home then m.away_score else m.home_score end) as conceded,
                 count(*) filter (where (case when f.is_home then m.away_score else m.home_score end) = 0) as clean_sheets,
                 sum(f.minutes_played) as minutes
          from marts.fct_player_match_stats f
          join marts.fct_match m using (match_key)
          join cur_season cs on cs.league = f.league and cs.season_year = f.season_year
          where f.played
          group by 1, 2
      ),
      form as (select * from marts.player_recent_form where window_days = 28),
      last_match as (
          select f.player_key, f.is_home, f.minutes_played, f.is_starter,
                 case when f.is_home then m.away_team_name else m.home_team_name end as opponent,
                 case when f.is_home then m.home_score else m.away_score end as goals_for,
                 case when f.is_home then m.away_score else m.home_score end as goals_against,
                 row_number() over (partition by f.player_key order by f.match_date desc) as rn
          from marts.fct_player_match_stats f join marts.fct_match m using (match_key)
          where f.played
      ),
      last_event as (
          select player_key, event_type, event_date, evidence,
                 row_number() over (partition by player_key order by importance desc, event_date desc) as rn
          from marts.movers, h where event_date >= h.horizon - 14
      ),
      focus as (select player_key, in_focus from marts.player_focus_set)
      select
          s.player_key, s.full_name, d.age, s.pos_group, d.primary_position, d.current_team_name as team, d.current_competition as competition,
          d.current_league as league, d.current_country as country, c.level_rank, s.is_abroad, coalesce(fo.in_focus, s.is_abroad) as in_focus,
          s.eligibility_status, d.has_arg_senior_cap, coalesce(s.in_last_squad, false) as in_last_squad, s.last_list_status, s.state,
          s.pos_rank, s.pos_size, s.rank_change, s.infirmary_reason, s.last_match_date, coalesce(s.team_matches_missed, 0) as team_matches_missed,
          s.minutes_share, s.starts_share, s.competition as competition_w, s.production, s.team_matches,
          se.season_year, se.appearances as season_apps, se.starts as season_starts, se.minutes as season_minutes, se.goals as season_goals, se.assists as season_assists,
          tm.team_matches as season_team_matches,
          case when tm.team_matches > 0 then least(1.0, se.minutes / (tm.team_matches * 90.0)) end as season_minutes_share,
          case when se.minutes >= 90 then round((se.goals + 0.7 * se.assists) * 90.0 / se.minutes, 2) end as ga_per90,
          co.conceded as season_conceded, co.clean_sheets as season_clean_sheets,
          case when co.minutes >= 90 then round(co.conceded * 90.0 / co.minutes, 2) end as conceded_per90,
          fm.minutes as min_28, fm.prev_minutes as min_prev_28, fm.minutes_change_pct as min_change_pct, fm.starts as starts_28, fm.prev_starts as starts_prev_28,
          se.avg_rating, se.xg, se.xa, d.market_value_eur,
          nm.opponent as next_opponent, nm.is_home as next_is_home, nm.kickoff_utc as next_kickoff, nm.competition_name as next_competition,
          lm.opponent as last_opponent, lm.is_home as last_is_home, lm.minutes_played as last_minutes, lm.is_starter as last_started,
          lm.goals_for as last_for, lm.goals_against as last_against,
          le.event_type as last_event_type, le.event_date as last_event_date, le.evidence as last_event_evidence
      from marts.player_state s
      join marts.dim_player d using (player_key)
      left join marts.dim_competition c on c.league = d.current_league
      left join focus fo using (player_key)
      left join season se on se.player_key = s.player_key and se.league = d.current_league
      left join team_season_matches tm on tm.espn_team_id = d.current_espn_team_id and tm.league = d.current_league
      left join conceded co on co.player_key = s.player_key and co.league = d.current_league
      left join form fm using (player_key)
      left join marts.player_next_match nm using (player_key)
      left join last_match lm on lm.player_key = s.player_key and lm.rn = 1
      left join last_event le on le.player_key = s.player_key and le.rn = 1
      order by s.pos_group, s.pos_rank nulls last, s.full_name
    `);
  }
  return poolCache;
}

/** Movers since the last squad announcement or the last 28 days, whichever is earlier; importance order. */
export function getMovers(limit = 3000) {
  return rows<MoverRow>(`
    with b as (
      select least(coalesce((select max(announcement_date) from marts.selection_windows where announcement_date <= as_of()), as_of() - 28), as_of() - 28) as since
    )
    select m.event_key, m.player_key, m.full_name, m.event_type, m.event_date, m.league, m.current_competition as competition, m.current_team_name as team,
           m.level_rank, coalesce(m.is_abroad, false) as is_abroad, m.age, m.pos_group, m.pos_rank, m.state, coalesce(m.in_last_squad, false) as in_last_squad,
           m.evidence, m.direction, m.importance
    from marts.movers m, b
    where m.event_date >= b.since
    order by m.importance desc, m.event_date desc, m.full_name
    limit ${Number(limit)}
  `);
}

/** Matches in the next seven days involving a pool player who is in the last squad or ranked in the top 10 of his position. */
export async function getWeekend(): Promise<WeekendMatch[]> {
  const r = await rows<Omit<WeekendMatch, "players"> & { players: string }>(`
    with pool as (select player_key, full_name, pos_group, pos_rank, coalesce(in_last_squad, false) as in_last_squad from marts.player_state where state <> 'retired'),
    nm as (select * from marts.player_next_match where match_date <= as_of() + 7),
    lines as (
      select nm.match_key, m.kickoff_utc, m.match_date, m.competition_name as competition, m.league, m.home_team_name as home_team, m.away_team_name as away_team,
             p.player_key, p.full_name, p.pos_group, p.pos_rank, p.in_last_squad, nm.is_home
      from nm join pool p using (player_key) join marts.fct_match m using (match_key)
    )
    select match_key, min(kickoff_utc) as kickoff_utc, min(match_date) as match_date, min(competition) as competition, min(league) as league,
           min(home_team) as home_team, min(away_team) as away_team,
           to_json(list({'player_key': player_key, 'full_name': full_name, 'pos_group': pos_group, 'pos_rank': pos_rank, 'in_last_squad': in_last_squad, 'is_home': is_home}
                        order by in_last_squad desc, pos_rank nulls last, full_name)) as players
    from lines
    group by match_key
    having bool_or(in_last_squad or pos_rank <= 10)
    order by kickoff_utc, match_key
  `);
  return r.map((m) => ({ ...m, players: JSON.parse(m.players) as WeekendMatch["players"] }));
}

let trajectoryCache: Promise<TrajectoryRow[]> | null = null;

export function getTrajectory(): Promise<TrajectoryRow[]> {
  if (!trajectoryCache) {
    trajectoryCache = rows<TrajectoryRow>(`
      select player_key, full_name, age, pos_group, primary_position, current_team_name as team, current_competition as competition, current_league as league,
             current_country as country, is_abroad, coalesce(has_arg_youth_cap, false) as has_arg_youth_cap, coalesce(has_arg_senior_cap, false) as has_arg_senior_cap,
             coalesce(has_other_senior_cap, false) as has_other_senior_cap, citizenships, coalesce(dual_national_untied, false) as dual_national_untied,
             activity_index, minutes_share, level_rank, team_matches, pos_rank, activity_index_year_ago, level_rank_year_ago,
             minutes_this_season, apps_this_season, minutes_last_season, age_p25, age_p50, age_p75, age_p90, trajectory, age_percentile,
             first_senior_season, first_senior_age_approx, first_abroad_date, first_abroad_country, first_abroad_competition, first_abroad_age
      from marts.player_trajectory
      order by trajectory desc nulls last, minutes_this_season desc nulls last, full_name
    `);
  }
  return trajectoryCache;
}

export function getAgeBands() {
  return rows<AgeBand>(`
    select age, min(age_p25) as p25, min(age_p50) as p50, min(age_p75) as p75, min(age_p90) as p90
    from marts.player_trajectory where age_p75 is not null group by 1 order by 1
  `);
}

function playerCalls(key: string) {
  return rows<PlayerCall>(`select window_id, status, club_at_call from marts.squad_lists where player_key = ? order by announcement_date`, [key]);
}

/** Everything the player page needs beyond the Phase 4 page: state row, rank history, call-ups, trajectory, status. */
export async function getPlayerExtra(key: string): Promise<PlayerExtra> {
  const [pool, rank_history, calls, windows, trajectory, nt] = await Promise.all([
    getPool(),
    rows<RankPoint>(
      `select as_of, is_window, pos_rank, pos_size, minutes_share, starts_share, production, competition, team_matches, minutes, starts, apps, goals, assists
       from marts.player_rank_history where player_key = ? order by as_of`,
      [key],
    ),
    playerCalls(key),
    getWindows(),
    one<TrajectoryRow>(
      `select player_key, full_name, age, pos_group, primary_position, current_team_name as team, current_competition as competition, current_league as league,
              current_country as country, is_abroad, coalesce(has_arg_youth_cap, false) as has_arg_youth_cap, coalesce(has_arg_senior_cap, false) as has_arg_senior_cap,
              coalesce(has_other_senior_cap, false) as has_other_senior_cap, citizenships, coalesce(dual_national_untied, false) as dual_national_untied,
              activity_index, minutes_share, level_rank, team_matches, pos_rank, activity_index_year_ago, level_rank_year_ago,
              minutes_this_season, apps_this_season, minutes_last_season, age_p25, age_p50, age_p75, age_p90, trajectory, age_percentile,
              first_senior_season, first_senior_age_approx, first_abroad_date, first_abroad_country, first_abroad_competition, first_abroad_age
       from marts.player_trajectory where player_key = ?`,
      [key],
    ),
    one<{ status: string; since: string | null }>(`select status, since from marts.nt_status where player_key = ?`, [key]),
  ]);
  return { state: pool.find((p) => p.player_key === key) ?? null, rank_history, calls, windows, trajectory, nt_status: nt };
}

// ---- Compare ---------------------------------------------------------------------------------------------------------

/** Radar axes per position group, in fixed order. `invert` means lower is better. */
export const COMPARE_AXES: Record<string, { key: string; invert?: boolean }[]> = {
  GK: [{ key: "minutes_share" }, { key: "starts_share" }, { key: "competition_w" }, { key: "clean_sheet_rate" }, { key: "conceded_per90", invert: true }, { key: "trend" }],
  DEF: [{ key: "minutes_share" }, { key: "starts_share" }, { key: "competition_w" }, { key: "clean_sheet_rate" }, { key: "conceded_per90", invert: true }, { key: "trend" }],
  MID: [{ key: "minutes_share" }, { key: "starts_share" }, { key: "competition_w" }, { key: "ga_per90" }, { key: "trend" }],
  FWD: [{ key: "minutes_share" }, { key: "starts_share" }, { key: "competition_w" }, { key: "ga_per90" }, { key: "trend" }],
};

function axisValue(p: PoolRow, key: string): number | null {
  switch (key) {
    case "minutes_share":
      return p.minutes_share;
    case "starts_share":
      return p.starts_share;
    case "competition_w":
      return p.competition_w;
    case "ga_per90":
      return p.ga_per90;
    case "clean_sheet_rate":
      return p.season_apps && p.season_apps > 0 && p.season_clean_sheets !== null ? Math.round((100 * p.season_clean_sheets) / p.season_apps) / 100 : null;
    case "conceded_per90":
      return p.conceded_per90;
    case "trend":
      if (p.min_change_pct !== null) return p.min_change_pct;
      if ((p.min_28 ?? 0) > 0) return 100;
      return null;
    default:
      return null;
  }
}

type Percentiles = Map<string, Map<string, number>>; // pos_group -> "key|player" -> pct
let pctCache: Promise<Percentiles> | null = null;

/** Percentile of every axis value among scored players of the same position (share of the group at or below the value). */
function percentiles(): Promise<Percentiles> {
  if (!pctCache) {
    pctCache = getPool().then((pool) => {
      const out: Percentiles = new Map();
      for (const group of Object.keys(COMPARE_AXES)) {
        const players = pool.filter((p) => p.pos_group === group && p.pos_rank !== null);
        const m = new Map<string, number>();
        for (const axis of COMPARE_AXES[group]!) {
          const vals = players.map((p) => ({ k: p.player_key, v: axisValue(p, axis.key) })).filter((x): x is { k: string; v: number } => x.v !== null);
          const sorted = vals.map((x) => (axis.invert ? -x.v : x.v)).sort((a, b) => a - b);
          const n = sorted.length;
          for (const x of vals) {
            const v = axis.invert ? -x.v : x.v;
            let below = 0;
            let equal = 0;
            for (const s of sorted) {
              if (s < v) below++;
              else if (s === v) equal++;
              else break;
            }
            m.set(`${axis.key}|${x.k}`, n ? Math.round((100 * (below + 0.5 * equal)) / n) : 0);
          }
        }
        out.set(group, m);
      }
      return out;
    });
  }
  return pctCache;
}

export async function getComparePlayer(key: string): Promise<ComparePlayer | null> {
  const [pool, pcts] = await Promise.all([getPool(), percentiles()]);
  const p = pool.find((x) => x.player_key === key);
  if (!p) return null;
  const axes: CompareAxis[] = (COMPARE_AXES[p.pos_group] ?? []).map((a) => ({
    key: a.key,
    value: axisValue(p, a.key),
    pct: pcts.get(p.pos_group)?.get(`${a.key}|${key}`) ?? null,
  }));
  const [spark, calls, extra] = await Promise.all([
    rows<{ date: string; minutes: number; starter: boolean }>(
      `select match_date as date, minutes_played as minutes, is_starter as starter from marts.fct_player_match_stats
       where player_key = ? and match_date >= as_of() - 120 order by match_date`,
      [key],
    ),
    playerCalls(key),
    one<{ caps: number | null; first_cap: string | null; minutes_last_season: number | null }>(
      `select d.tm_international_caps as caps, d.first_arg_senior_cap_date as first_cap,
              (select sum(s.minutes) from marts.player_season_stats s
                join (select league, max(season_year) - 1 as season_year from marts.fct_match group by 1) prev using (league, season_year)
                where s.player_key = d.player_key) as minutes_last_season
       from marts.dim_player d where d.player_key = ?`,
      [key],
    ),
  ]);
  return {
    player_key: p.player_key,
    full_name: p.full_name,
    team: p.team,
    competition: p.competition,
    level_rank: p.level_rank,
    age: p.age,
    pos_group: p.pos_group,
    state: p.state,
    pos_rank: p.pos_rank,
    pos_size: p.pos_size,
    rank_change: p.rank_change,
    in_last_squad: p.in_last_squad,
    infirmary_reason: p.infirmary_reason,
    axes,
    season: {
      season_year: p.season_year,
      apps: p.season_apps,
      starts: p.season_starts,
      minutes: p.season_minutes,
      goals: p.season_goals,
      assists: p.season_assists,
      ga_per90: p.ga_per90,
      xg: p.xg,
      xa: p.xa,
      avg_rating: p.avg_rating,
      minutes_last_season: extra?.minutes_last_season ?? null,
    },
    spark,
    calls,
    caps: extra?.caps ?? null,
    first_cap: extra?.first_cap ?? null,
    market_value_eur: p.market_value_eur,
  };
}

/** The compact per-player record the follow list and Mi tablero render client-side from one file. */
export async function getPoolJson() {
  const pool = await getPool();
  return pool.map((p) => ({
    k: p.player_key,
    n: p.full_name,
    t: p.team,
    c: p.competition,
    g: p.pos_group,
    a: p.age,
    r: p.pos_rank,
    d: p.rank_change,
    s: p.state,
    i: p.infirmary_reason,
    q: p.in_last_squad ? 1 : 0,
    lm: p.last_match_date ? { d: p.last_match_date, o: p.last_opponent, h: p.last_is_home, m: p.last_minutes, st: p.last_started, f: p.last_for, ag: p.last_against } : null,
    nm: p.next_kickoff ? { o: p.next_opponent, h: p.next_is_home, k: p.next_kickoff, c: p.next_competition } : null,
    ev: p.last_event_type ? { t: p.last_event_type, d: p.last_event_date, e: p.last_event_evidence } : null,
    mm: p.team_matches_missed,
  }));
}

export function horizon(): string {
  return manifest().data_as_of;
}

// ---- La fecha ----------------------------------------------------------------------------------------------------------

/** Every calendar week (Monday start) with at least one completed match in the data, oldest first. */
export function getWeeks() {
  return rows<RoundWeek>(`
    select date_trunc('week', match_date)::date as week_start, (date_trunc('week', match_date) + interval 6 day)::date as week_end, count(*) as matches
    from marts.fct_match where is_completed group by 1, 2 order by 1
  `);
}

/** Monday of the week that holds the data horizon. */
export async function currentWeekStart(): Promise<string> {
  const r = await one<{ ws: string }>(`select date_trunc('week', as_of())::date as ws`);
  return r!.ws;
}

/**
 * The round: one row per pool player whose club played in the week (or who is in the last squad, ranked, or followed later
 * on the client), with the club's matches as sub-lines and the week's totals. Rank and team are taken as of the week's Monday.
 */
const roundCache = new Map<string, Promise<RoundRow[]>>();

export function getRound(weekStart: string): Promise<RoundRow[]> {
  if (!roundCache.has(weekStart)) roundCache.set(weekStart, loadRound(weekStart));
  return roundCache.get(weekStart)!;
}

/** The default scope of the round page: the last squad and the top fifteen of each position. */
export function inRoundScope(r: RoundRow): boolean {
  return r.in_last_squad || (r.pos_rank !== null && r.pos_rank <= 15);
}

async function loadRound(weekStart: string): Promise<RoundRow[]> {
  const r = await rows<Omit<RoundRow, "matches"> & { matches: string }>(
    `
    with wk as (select ?::date as ws, (?::date + interval 6 day)::date as we),
    pool as (
      select s.player_key, s.full_name, s.pos_group, coalesce(s.in_last_squad, false) as in_last_squad, s.state, s.infirmary_reason,
             d.current_espn_team_id, d.current_team_name, d.current_league, d.current_competition
      from marts.player_state s join marts.dim_player d using (player_key)
      where s.state <> 'retired'
    ),
    rank_asof as (
      select player_key, team_id, pos_rank
      from marts.player_rank_history, wk
      where as_of <= wk.ws
      qualify row_number() over (partition by player_key order by as_of desc) = 1
    ),
    -- the team the player belonged to that week: his own rows in the week, else the rank history's team, else the current club
    week_rows as (
      select f.player_key, f.match_key, f.espn_team_id, f.played, f.is_starter, f.minutes_played, f.goals, f.assists, f.match_rating, f.is_home
      from marts.fct_player_match_stats f join marts.fct_match m using (match_key), wk
      where m.match_date between wk.ws and wk.we and m.is_completed
    ),
    team_of as (
      select p.player_key,
             coalesce((select min(w.espn_team_id) from week_rows w where w.player_key = p.player_key), a.team_id, p.current_espn_team_id) as team_id
      from pool p left join rank_asof a using (player_key)
    ),
    club_matches as (
      select t.player_key, m.match_key, m.match_date, m.home_team_name as home_team, m.away_team_name as away_team, m.home_score, m.away_score,
             (m.home_espn_team_id = t.team_id) as is_home, m.competition_name as competition
      from team_of t join marts.fct_match m on t.team_id in (m.home_espn_team_id, m.away_espn_team_id), wk
      where m.match_date between wk.ws and wk.we and m.is_completed
    ),
    lines as (
      select c.*, w.played, w.is_starter, w.minutes_played as minutes, w.goals, w.assists, w.match_rating as rating
      from club_matches c left join week_rows w on w.player_key = c.player_key and w.match_key = c.match_key
    ),
    agg as (
      select player_key,
             count(*) as team_matches,
             count(*) filter (where played) as apps,
             count(*) filter (where is_starter) as starts,
             coalesce(sum(minutes), 0) as minutes,
             coalesce(sum(goals), 0) as goals,
             coalesce(sum(assists), 0) as assists,
             avg(rating) filter (where played) as rating,
             to_json(list({'match_key': match_key, 'match_date': match_date, 'home_team': home_team, 'away_team': away_team,
                           'home_score': home_score, 'away_score': away_score, 'is_home': is_home, 'competition': competition,
                           'played': played, 'is_starter': is_starter, 'minutes': minutes, 'goals': goals, 'assists': assists, 'rating': rating}
                          order by match_date, match_key)) as matches
      from lines group by 1
    )
    select p.player_key, p.full_name, p.pos_group, a.pos_rank, p.in_last_squad, p.state, p.infirmary_reason,
           coalesce((select min(coalesce(t.team_name, '')) from marts.dim_team t where t.espn_team_id = tf.team_id and t.is_current_member), p.current_team_name) as team,
           p.current_competition as competition, p.current_league as league,
           case when coalesce(g.apps, 0) > 0 then 'played' when coalesce(g.team_matches, 0) > 0 then 'did_not_play' else 'club_idle' end as category,
           coalesce(g.matches, '[]') as matches,
           coalesce(g.team_matches, 0) as team_matches, coalesce(g.apps, 0) as apps, coalesce(g.starts, 0) as starts,
           coalesce(g.minutes, 0) as minutes, coalesce(g.goals, 0) as goals, coalesce(g.assists, 0) as assists, g.rating
    from pool p
    left join rank_asof a using (player_key)
    left join team_of tf using (player_key)
    left join agg g using (player_key)
    order by p.pos_group, a.pos_rank nulls last, p.full_name
    `,
    [weekStart, weekStart],
  );
  return r.map((x) => ({ ...x, matches: JSON.parse(x.matches) as RoundMatch[] }));
}

/** Movers dated inside a window, importance order. */
export function getMoversBetween(from: string, to: string, limit = 60) {
  return rows<MoverRow>(
    `select m.event_key, m.player_key, m.full_name, m.event_type, m.event_date, m.league, m.current_competition as competition, m.current_team_name as team,
            m.level_rank, coalesce(m.is_abroad, false) as is_abroad, m.age, m.pos_group, m.pos_rank, m.state, coalesce(m.in_last_squad, false) as in_last_squad,
            m.evidence, m.direction, m.importance
     from marts.movers m where m.event_date between ?::date and ?::date
     order by m.importance desc, m.event_date desc, m.full_name limit ${Number(limit)}`,
    [from, to],
  );
}
