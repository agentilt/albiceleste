export type Eligibility = "eligible" | "review" | "youth_only";

export interface Competition {
  league: string;
  competition_name: string;
  country: string;
  level_rank: number;
  is_argentina_domestic: boolean;
}

export interface Presence {
  league: string;
  competition: string;
  country: string;
  players: number;
  players_u23: number;
  senior_internationals: number;
  under_review: number;
  clubs_with_argentines: number;
}

export interface PlayerIndexEntry {
  key: string;
  name: string;
  team: string | null;
  competition: string | null;
  league: string | null;
}

export interface Player {
  player_key: string;
  full_name: string;
  source_name: string | null;
  dob: string | null;
  age: number | null;
  citizenships: string[] | null;
  positions: string[] | null;
  primary_position: string | null;
  place_of_birth: string | null;
  height_cm: number | null;
  has_arg_senior_cap: boolean;
  has_arg_youth_cap: boolean;
  has_other_senior_cap: boolean;
  other_senior_teams: string | null;
  first_arg_senior_cap_date: string | null;
  eligibility_status: Eligibility;
  eligibility_basis: string | null;
  identity_source: string;
  in_tracked_squad: boolean;
  current_team_name: string | null;
  current_league: string | null;
  current_competition: string | null;
  current_country: string | null;
  is_abroad: boolean;
  jersey: string | null;
  is_injured: boolean;
  injury_status: string | null;
  squad_as_of: string | null;
  market_value_eur: number | null;
  highest_market_value_eur: number | null;
  tm_international_caps: number | null;
  contract_expiration_date: string | null;
}

export interface SeasonLine {
  league: string;
  competition_name: string;
  season_year: number;
  appearances: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  xg: number | null;
  xa: number | null;
  avg_rating: number | null;
  goals_per90: number | null;
  xg_per90: number | null;
  rows_from_highlightly: number;
  rows_from_espn: number;
}

export interface MatchLine {
  match_key: string;
  match_date: string;
  competition_name: string;
  home_team_name: string;
  away_team_name: string;
  home_score: number | null;
  away_score: number | null;
  is_home: boolean | null;
  is_starter: boolean;
  played: boolean;
  minutes_played: number;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xa: number | null;
  match_rating: number | null;
  stats_source: string;
}

export interface FormWindow {
  window_days: number;
  team_matches: number;
  apps: number;
  starts: number;
  minutes: number;
  minutes_share_pct: number | null;
  prev_minutes: number;
  prev_minutes_share_pct: number | null;
  minutes_change_pct: number | null;
  starts_change: number | null;
  goals: number;
  assists: number;
  xg: number | null;
  xa: number | null;
}

export interface EventRow {
  event_key: string;
  event_date: string;
  severity: number;
  event_type: string;
  headline: string;
  evidence: string | null;
  league: string | null;
}

export interface SeasonHistory {
  season: number;
  competition_name: string | null;
  club_name: string | null;
  appearances: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
}

export interface Transfer {
  transfer_date: string;
  from_club_name: string | null;
  to_club_name: string | null;
  to_competition: string | null;
  to_country: string | null;
  transfer_fee_eur: number | null;
  market_value_eur: number | null;
  age_at_transfer: number | null;
}

export interface Valuation {
  valuation_date: string;
  market_value_eur: number;
}

export interface SourceId {
  source: string;
  source_id: string;
}

export interface PlayerPage {
  player: Player;
  seasons: SeasonLine[];
  matches: MatchLine[];
  form: FormWindow[];
  events: EventRow[];
  history: SeasonHistory[];
  transfers: Transfer[];
  valuations: Valuation[];
  sourceIds: SourceId[];
}

export interface ExportByCountry {
  to_country: string;
  players_exported: number;
}

export interface ExportByYear {
  transfer_year: number;
  players_exported: number;
  avg_age: number | null;
}

export interface RawSummary {
  source: string;
  entity: string;
  records: number;
  versions: number;
  last_ingested: string;
}

export interface Coverage {
  league: string;
  matches: number;
  with_highlightly_match: number;
  with_fd_match: number;
  with_box_score_rows: number;
}

export interface StatsBySource {
  league: string;
  stats_source: string;
  rows: number;
  players: number;
}

export interface Agreement {
  pairs: number;
  pct_within_3_min: number;
  mean_abs_diff: number;
  max_abs_diff: number;
}

export interface Unmatched {
  issue: string;
  league: string | null;
  subject: string | null;
  subject_id: string | null;
  detail: string | null;
}

export interface PipelineRun {
  started_at: string;
  command: string;
  status: string;
  records_written: number | null;
  requests_made: number | null;
}

// ---- Phase 6: the pages of the briefs -------------------------------------------------------------------------------

export type PosGroup = "GK" | "DEF" | "MID" | "FWD";
export type State =
  | "retired"
  | "out"
  | "just_moved"
  | "back"
  | "no_position"
  | "no_minutes"
  | "short_minutes"
  | "on_fire"
  | "rising"
  | "declining"
  | "established"
  | "steady";
export type InfirmaryReason = "injured" | "suspended" | "absent";

export interface SelectionWindow {
  window_id: string;
  label_es: string;
  label_en: string;
  starts: string;
  ends: string;
  max_matches: number | null;
  announcement_date: string | null;
  announcement_status: "official" | "expected";
  matches_note: string | null;
  source: string | null;
  listed: number;
  resolved: number;
}

export interface SquadListRow {
  window_id: string;
  announcement_date: string;
  player_name: string;
  club_at_call: string | null;
  pos_group: string | null;
  status: string;
  player_key: string | null;
  resolution: string;
}

export interface YouthEvent {
  event_id: string;
  label_es: string;
  label_en: string;
  starts: string;
  ends: string;
  status: string;
  note: string | null;
}

export interface MethodParameter {
  kind: "threshold" | "weight" | "event_weight";
  name: string;
  value: number;
  description: string | null;
  pos_group: string | null;
  component: string | null;
}

/** One pool player: the row the Pool list, the depth chart, the follow list and the per-player JSON are built from. */
export type Role = "GK" | "RB" | "CB" | "LB" | "DM" | "CM" | "AM" | "RW" | "LW" | "ST";
export const ROLES: Role[] = ["GK", "RB", "CB", "LB", "DM", "CM", "AM", "RW", "LW", "ST"];
/** The slot a player falls to when the source has no sub-position: the natural centre of his group. */
export const ROLE_OF_GROUP: Record<string, Role> = { GK: "GK", DEF: "CB", MID: "CM", FWD: "ST" };

export interface PoolRow {
  player_key: string;
  full_name: string;
  age: number | null;
  pos_group: PosGroup | "UNK";
  primary_position: string | null;
  /** Transfermarkt sub-position ("Centre-Back", "Left Winger"…) */
  sub_position: string | null;
  /** the pitch slot derived from it: GK RB CB LB DM CM AM RW LW ST; null when the source has none */
  role: Role | null;
  team: string | null;
  team_short: string | null;
  competition: string | null;
  league: string | null;
  country: string | null;
  level_rank: number | null;
  is_abroad: boolean;
  in_focus: boolean;
  eligibility_status: Eligibility;
  has_arg_senior_cap: boolean;
  in_last_squad: boolean;
  in_watch: boolean;
  last_list_status: string | null;
  state: State;
  pos_rank: number | null;
  pos_size: number | null;
  rank_change: number | null;
  infirmary_reason: InfirmaryReason | null;
  last_match_date: string | null;
  team_matches_missed: number;
  // score components over the scoring window (shares in [0,1]); the score itself is never exported
  minutes_share: number | null;
  starts_share: number | null;
  competition_w: number | null;
  production: number | null;
  team_matches: number | null;
  // this season, current league
  season_year: number | null;
  season_apps: number | null;
  season_starts: number | null;
  season_minutes: number | null;
  season_goals: number | null;
  season_assists: number | null;
  season_team_matches: number | null;
  season_minutes_share: number | null;
  ga_per90: number | null;
  season_conceded: number | null;
  season_clean_sheets: number | null;
  conceded_per90: number | null;
  // last 28 days against the 28 before
  min_28: number | null;
  min_prev_28: number | null;
  min_change_pct: number | null;
  starts_28: number | null;
  starts_prev_28: number | null;
  // supporting
  avg_rating: number | null;
  xg: number | null;
  xa: number | null;
  market_value_eur: number | null;
  // next and last match
  next_opponent: string | null;
  next_is_home: boolean | null;
  next_kickoff: string | null;
  next_competition: string | null;
  last_opponent: string | null;
  last_is_home: boolean | null;
  last_minutes: number | null;
  last_started: boolean | null;
  last_for: number | null;
  last_against: number | null;
  // latest noteworthy event in the last 14 days
  last_event_type: string | null;
  last_event_date: string | null;
  last_event_evidence: string | null;
}

export interface MoverRow {
  event_key: string;
  player_key: string;
  full_name: string;
  event_type: string;
  event_date: string;
  league: string | null;
  competition: string | null;
  team: string | null;
  level_rank: number | null;
  is_abroad: boolean;
  age: number | null;
  pos_group: string | null;
  pos_rank: number | null;
  state: State | null;
  in_last_squad: boolean;
  evidence: string;
  direction: "up" | "down" | "neutral";
  importance: number;
}

export interface RankPoint {
  as_of: string;
  is_window: boolean;
  pos_rank: number | null;
  pos_size: number | null;
  minutes_share: number | null;
  starts_share: number | null;
  production: number | null;
  competition: number | null;
  team_matches: number | null;
  minutes: number | null;
  starts: number | null;
  apps: number | null;
  goals: number | null;
  assists: number | null;
}

export interface PlayerCall {
  window_id: string;
  status: string;
  club_at_call: string | null;
}

export interface TrajectoryRow {
  player_key: string;
  full_name: string;
  age: number | null;
  pos_group: string | null;
  primary_position: string | null;
  team: string | null;
  competition: string | null;
  league: string | null;
  country: string | null;
  is_abroad: boolean;
  has_arg_youth_cap: boolean;
  has_arg_senior_cap: boolean;
  has_other_senior_cap: boolean;
  citizenships: string[] | null;
  dual_national_untied: boolean;
  activity_index: number | null;
  minutes_share: number | null;
  level_rank: number | null;
  team_matches: number | null;
  pos_rank: number | null;
  activity_index_year_ago: number | null;
  level_rank_year_ago: number | null;
  minutes_this_season: number | null;
  apps_this_season: number | null;
  minutes_last_season: number | null;
  age_p25: number | null;
  age_p50: number | null;
  age_p75: number | null;
  age_p90: number | null;
  trajectory: number | null;
  age_percentile: number | null;
  first_senior_season: number | null;
  first_senior_age_approx: number | null;
  first_abroad_date: string | null;
  first_abroad_country: string | null;
  first_abroad_competition: string | null;
  first_abroad_age: number | null;
}

export interface AgeBand {
  age: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface WeekendMatch {
  match_key: string;
  kickoff_utc: string;
  match_date: string;
  competition: string;
  league: string;
  home_team: string;
  away_team: string;
  players: { player_key: string; full_name: string; pos_group: string | null; pos_rank: number | null; in_last_squad: boolean; is_home: boolean }[];
}

/** The per-player JSON behind Compare and the follow list. */
export interface CompareAxis {
  key: string;
  value: number | null;
  pct: number | null;
}

export interface ComparePlayer {
  player_key: string;
  full_name: string;
  team: string | null;
  competition: string | null;
  level_rank: number | null;
  age: number | null;
  pos_group: string;
  state: State;
  pos_rank: number | null;
  pos_size: number | null;
  rank_change: number | null;
  in_last_squad: boolean;
  infirmary_reason: InfirmaryReason | null;
  axes: CompareAxis[];
  season: {
    season_year: number | null;
    apps: number | null;
    starts: number | null;
    minutes: number | null;
    goals: number | null;
    assists: number | null;
    ga_per90: number | null;
    xg: number | null;
    xa: number | null;
    avg_rating: number | null;
    minutes_last_season: number | null;
  };
  spark: { date: string; minutes: number; starter: boolean }[];
  calls: PlayerCall[];
  caps: number | null;
  first_cap: string | null;
  market_value_eur: number | null;
}

export interface PlayerExtra {
  state: PoolRow | null;
  rank_history: RankPoint[];
  calls: PlayerCall[];
  windows: SelectionWindow[];
  trajectory: TrajectoryRow | null;
  nt_status: { status: string; since: string | null } | null;
}

// ---- La fecha (the round in review) ----------------------------------------------------------------------------------

export interface RoundMatch {
  match_key: string;
  match_date: string;
  home_team: string;
  away_team: string;
  home_score: number | null;
  away_score: number | null;
  is_home: boolean;
  competition: string;
  /** null when the player has no row for the club's match (unused or absent) */
  played: boolean | null;
  is_starter: boolean | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  rating: number | null;
}

export type RoundCategory = "played" | "did_not_play" | "club_idle";

export interface RoundRow {
  player_key: string;
  full_name: string;
  pos_group: string;
  /** rank within the position as of the week's Monday (null before the ranking starts) */
  pos_rank: number | null;
  in_last_squad: boolean;
  in_watch: boolean;
  has_arg_senior_cap: boolean;
  is_abroad: boolean;
  /** minutes share over the scoring window at the horizon: who counts as a regular */
  minutes_share: number | null;
  state: State;
  infirmary_reason: InfirmaryReason | null;
  team: string | null;
  competition: string | null;
  league: string | null;
  category: RoundCategory;
  matches: RoundMatch[];
  team_matches: number;
  apps: number;
  starts: number;
  minutes: number;
  goals: number;
  assists: number;
  rating: number | null;
}

export interface RoundWeek {
  week_start: string;
  week_end: string;
  matches: number;
}
