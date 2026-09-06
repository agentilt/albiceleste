import { one, rows } from "./db";
import type {
  AbroadRow,
  Agreement,
  Competition,
  Coverage,
  EventRow,
  ExportByCountry,
  ExportByYear,
  ExportingClub,
  FeedItem,
  FocusRow,
  FormWindow,
  Kpis,
  MatchLine,
  Mover,
  PipelineRun,
  Player,
  PlayerIndexEntry,
  PlayerPage,
  Presence,
  RawSummary,
  SeasonHistory,
  SeasonLine,
  SourceId,
  StatsBySource,
  Transfer,
  Unmatched,
  Valuation,
} from "./types";

/** Players that get a page: everyone in a tracked squad plus capped internationals known from Wikidata. */
const PAGE_PLAYERS = `(in_tracked_squad or (eligibility_status = 'eligible' and identity_source = 'wikidata' and has_arg_senior_cap))`;

export function getCompetitions() {
  return rows<Competition>(
    `select league, competition_name, country, level_rank, is_argentina_domestic from marts.dim_competition order by level_rank, league`,
  );
}

export async function getKpis(): Promise<Kpis> {
  const k = await one<Kpis>(`
    select
      (select count(*) from marts.dim_player where eligibility_status in ('eligible','review')) as eligible,
      (select count(*) from marts.dim_player where in_tracked_squad) as in_squads,
      (select count(*) from marts.dim_player where is_abroad) as abroad,
      (select count(*) from marts.player_focus_set where in_focus) as in_focus,
      (select count(*) from marts.player_events where event_date >= as_of() - 7) as events_7d,
      (select count(*) from marts.fct_match where is_completed) as matches
  `);
  if (!k) throw new Error("kpis");
  return k;
}

export function getPresence() {
  return rows<Presence>(`select * from marts.argentine_league_presence order by players desc`);
}

export function getFeed(limit = 1000) {
  return rows<FeedItem>(
    `select event_key, event_date, severity, event_type, headline, full_name, player_key, current_team_name, current_league, current_country, focus_reasons
     from marts.watch_feed order by event_date desc, severity desc, full_name limit ${Number(limit)}`,
  );
}

export function getMovers(limit = 15) {
  return rows<Mover>(`
    select d.player_key, d.full_name, d.current_team_name as team, d.current_competition as competition, f.minutes, f.prev_minutes,
           f.minutes_change_pct, f.starts, f.prev_starts, f.minutes_share_pct
    from marts.player_recent_form f join marts.dim_player d using (player_key)
    where f.window_days = 28 and d.is_abroad and (f.minutes >= 90 or f.prev_minutes >= 90)
    order by abs(coalesce(f.minutes_change_pct, 0)) desc nulls last, f.minutes desc limit ${Number(limit)}
  `);
}

export function getAbroad() {
  return rows<AbroadRow>(`
    select player_key, full_name, age, primary_position, current_team_name as team, current_competition as competition, current_country as country,
           appearances, starts, minutes, goals, assists, xg, xa, avg_rating, eligibility_status, has_arg_senior_cap, is_injured
    from marts.argentine_players_abroad
    order by minutes desc nulls last, full_name
  `);
}

export function getFocus() {
  return rows<FocusRow>(`
    select player_key, full_name, age, pos_group, current_team_name as team, current_competition as competition, current_league,
           starts, minutes, goals, assists, starts_last5, starts_prev5, minutes_rank_in_position, reasons
    from marts.player_focus_set where in_focus
    order by minutes desc nulls last, full_name
  `);
}

export function getPlayerIndex() {
  return rows<PlayerIndexEntry>(`
    select player_key as key, full_name as name, current_team_name as team, current_competition as competition
    from marts.dim_player where ${PAGE_PLAYERS}
    order by in_tracked_squad desc, full_name
  `);
}

export async function getPlayerKeys(): Promise<string[]> {
  const r = await rows<{ player_key: string }>(`select player_key from marts.dim_player where ${PAGE_PLAYERS}`);
  return r.map((x) => x.player_key);
}

export async function getPlayerPage(key: string): Promise<PlayerPage | null> {
  const player = await one<Player>(
    `select player_key, full_name, source_name, dob, age, citizenships, positions, primary_position, place_of_birth, height_cm,
            has_arg_senior_cap, has_arg_youth_cap, has_other_senior_cap, other_senior_teams, first_arg_senior_cap_date,
            eligibility_status, eligibility_basis, identity_source, in_tracked_squad, current_team_name, current_league,
            current_competition, current_country, is_abroad, jersey, is_injured, injury_status, squad_as_of,
            market_value_eur, highest_market_value_eur, tm_international_caps, contract_expiration_date
     from marts.dim_player where player_key = ?`,
    [key],
  );
  if (!player) return null;
  const [seasons, matches, form, events, history, transfers, valuations, sourceIds] = await Promise.all([
    rows<SeasonLine>(
      `select s.league, c.competition_name, s.season_year, s.appearances, s.starts, s.minutes, s.goals, s.assists, s.xg, s.xa, s.avg_rating,
              s.goals_per90, s.xg_per90, s.rows_from_highlightly, s.rows_from_espn
       from marts.player_season_stats s left join marts.dim_competition c using (league)
       where s.player_key = ? order by s.season_year desc, s.minutes desc`,
      [key],
    ),
    rows<MatchLine>(
      `select f.match_key, f.match_date, m.competition_name, m.home_team_name, m.away_team_name, m.home_score, m.away_score, f.is_home,
              f.is_starter, f.played, f.minutes_played, f.goals, f.assists, f.xg, f.xa, f.match_rating, f.stats_source
       from marts.fct_player_match_stats f join marts.fct_match m using (match_key)
       where f.player_key = ? order by f.match_date desc limit 60`,
      [key],
    ),
    rows<FormWindow>(
      `select window_days, team_matches, apps, starts, minutes, minutes_share_pct, prev_minutes, prev_minutes_share_pct, minutes_change_pct,
              starts_change, goals, assists, xg, xa
       from marts.player_recent_form where player_key = ? order by window_days`,
      [key],
    ),
    rows<EventRow>(
      `select event_key, event_date, severity, event_type, headline from marts.player_events where player_key = ? order by event_date desc, severity desc`,
      [key],
    ),
    rows<SeasonHistory>(
      `select season, competition_name, club_name, appearances, minutes, goals, assists from marts.player_season_history
       where player_key = ? order by season desc, minutes desc nulls last`,
      [key],
    ),
    rows<Transfer>(
      `select transfer_date, from_club_name, to_club_name, to_competition, to_country, transfer_fee_eur, market_value_eur, age_at_transfer
       from marts.player_career_history where player_key = ? order by transfer_date`,
      [key],
    ),
    rows<Valuation>(`select valuation_date, market_value_eur from marts.player_market_values where player_key = ? order by 1`, [key]),
    rows<SourceId>(`select source, source_id from marts.player_source_ids where player_key = ? order by source`, [key]),
  ]);
  return { player, seasons, matches, form, events, history, transfers, valuations, sourceIds };
}

export function getExportsByCountry(yearFrom: number, limit = 12) {
  return rows<ExportByCountry>(
    `select to_country, sum(players_exported)::bigint as players_exported from marts.argentine_export_summary
     where transfer_year >= ? group by 1 order by 2 desc limit ${Number(limit)}`,
    [yearFrom],
  );
}

export function getExportsByYear(yearFrom: number) {
  return rows<ExportByYear>(
    `select transfer_year, sum(players_exported)::bigint as players_exported, round(avg(avg_age_at_export), 1) as avg_age
     from marts.argentine_export_summary where transfer_year >= ? group by 1 order by 1`,
    [yearFrom],
  );
}

export function getExportingClubs(limit = 25) {
  return rows<ExportingClub>(
    `select from_club_name as club, players_exported, exported_last_10y, to_europe, avg_age_at_export, total_fees_eur
     from marts.argentine_exporting_clubs limit ${Number(limit)}`,
  );
}

export function getRawSummary() {
  return rows<RawSummary>(`select source, entity, records, versions, last_ingested from meta.raw_summary order by 1, 2`);
}

export function getStatsBySource() {
  return rows<StatsBySource>(
    `select league, stats_source, count(*)::bigint as rows, count(distinct player_key)::bigint as players
     from marts.fct_player_match_stats group by 1, 2 order by 1, 2`,
  );
}

export function getAgreement() {
  return one<Agreement>(`select pairs, pct_within_3_min, mean_abs_diff, max_abs_diff from marts.dq_minutes_agreement`);
}

export function getCoverage() {
  return rows<Coverage>(`
    select m.league, count(*)::bigint as matches, count(m.hl_match_id)::bigint as with_highlightly_match, count(m.fd_match_id)::bigint as with_fd_match,
           count(*) filter (where exists (select 1 from marts.fct_player_match_stats f where f.match_key = m.match_key and f.stats_source = 'highlightly'))::bigint as with_box_score_rows
    from marts.fct_match m where m.is_completed group by 1 order by 1
  `);
}

export function getUnmatched() {
  return rows<Unmatched>(`select issue, league, subject, subject_id, detail from marts.dq_unmatched order by issue, league, subject`);
}

export function getPipelineRuns(limit = 15) {
  return rows<PipelineRun>(
    `select started_at, command, status, records_written, requests_made from meta.pipeline_runs order by started_at desc limit ${Number(limit)}`,
  );
}
