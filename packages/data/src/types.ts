export type Eligibility = "eligible" | "review" | "youth_only";

export interface Competition {
  league: string;
  competition_name: string;
  country: string;
  level_rank: number;
  is_argentina_domestic: boolean;
}

export interface Kpis {
  eligible: number;
  in_squads: number;
  abroad: number;
  in_focus: number;
  events_7d: number;
  matches: number;
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

export interface FeedItem {
  event_key: string;
  event_date: string;
  severity: number;
  event_type: string;
  headline: string;
  full_name: string;
  player_key: string;
  current_team_name: string | null;
  current_league: string | null;
  current_country: string | null;
  focus_reasons: string[] | null;
}

export interface Mover {
  player_key: string;
  full_name: string;
  team: string | null;
  competition: string | null;
  minutes: number;
  prev_minutes: number;
  minutes_change_pct: number | null;
  starts: number;
  prev_starts: number;
  minutes_share_pct: number | null;
}

export interface AbroadRow {
  player_key: string;
  full_name: string;
  age: number | null;
  primary_position: string | null;
  team: string | null;
  competition: string | null;
  country: string | null;
  appearances: number | null;
  starts: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  xg: number | null;
  xa: number | null;
  avg_rating: number | null;
  eligibility_status: Eligibility;
  has_arg_senior_cap: boolean;
  is_injured: boolean;
}

export interface FocusRow {
  player_key: string;
  full_name: string;
  age: number | null;
  pos_group: string | null;
  team: string | null;
  competition: string | null;
  current_league: string | null;
  starts: number | null;
  minutes: number | null;
  goals: number | null;
  assists: number | null;
  starts_last5: number | null;
  starts_prev5: number | null;
  minutes_rank_in_position: number | null;
  reasons: string[];
}

export interface PlayerIndexEntry {
  key: string;
  name: string;
  team: string | null;
  competition: string | null;
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

export interface ExportingClub {
  club: string;
  players_exported: number;
  exported_last_10y: number;
  to_europe: number;
  avg_age_at_export: number | null;
  total_fees_eur: number | null;
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
