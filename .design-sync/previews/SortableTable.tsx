import { SortableTable, type ColumnSpec, type Row } from "@albiceleste/ui";

const COLUMNS: ColumnSpec[] = [
  { key: "full_name", label: "Player", kind: "link" },
  { key: "age", label: "Age", kind: "int" },
  { key: "primary_position", label: "Position" },
  { key: "team", label: "Club" },
  { key: "competition", label: "Competition" },
  { key: "starts", label: "Starts", kind: "int" },
  { key: "minutes", label: "Minutes", kind: "int" },
  { key: "goals", label: "G", kind: "int" },
  { key: "xg", label: "xG", kind: "dec2" },
  { key: "market_value_eur", label: "Value", kind: "eur" },
  { key: "last_match", label: "Last match", kind: "date" },
  { key: "has_arg_senior_cap", label: "Senior cap", kind: "bool" },
  { key: "reasons", label: "Why in focus", kind: "list" },
];

const ROWS: Row[] = [
  { player_key: "Q1", full_name: "Julián Álvarez", age: 26, primary_position: "Forward", team: "Atlético Madrid", competition: "La Liga", starts: 4, minutes: 356, goals: 3, xg: 2.41, market_value_eur: 90000000, last_match: "2026-09-05", has_arg_senior_cap: true, reasons: ["abroad", "senior cap"] },
  { player_key: "Q2", full_name: "Alexis Mac Allister", age: 27, primary_position: "Midfielder", team: "Liverpool", competition: "Premier League", starts: 3, minutes: 251, goals: 0, xg: 0.32, market_value_eur: 85000000, last_match: "2026-09-04", has_arg_senior_cap: true, reasons: ["abroad", "senior cap"] },
  { player_key: "Q3", full_name: "Valentín Carboni", age: 21, primary_position: "Midfielder", team: "Genoa", competition: "Serie A", starts: 2, minutes: 148, goals: 1, xg: null, market_value_eur: 12000000, last_match: "2026-09-05", has_arg_senior_cap: false, reasons: ["abroad", "U23 regular"] },
  { player_key: "Q4", full_name: "Agustín Rossi", age: 31, primary_position: "Goalkeeper", team: "Flamengo", competition: "Brasileirão Série A", starts: 25, minutes: 2250, goals: 0, xg: null, market_value_eur: 6000000, last_match: "2026-09-03", has_arg_senior_cap: false, reasons: ["abroad"] },
  { player_key: "Q5", full_name: "Kevin Lomónaco", age: 24, primary_position: "Defender", team: "Elche", competition: "La Liga", starts: 4, minutes: 360, goals: 0, xg: 0.08, market_value_eur: 7000000, last_match: "2026-09-05", has_arg_senior_cap: false, reasons: ["abroad", "rising starter"] },
];

export const PlayersAbroad = () => <SortableTable columns={COLUMNS} rows={ROWS} initialSort="minutes" hrefFor={(k) => `/players/${k}`} />;

export const SortedByName = () => <SortableTable columns={COLUMNS.slice(0, 7)} rows={ROWS} initialSort="full_name" initialDir="asc" hrefFor={(k) => `/players/${k}`} sticky={false} />;

export const Empty = () => <SortableTable columns={COLUMNS.slice(0, 5)} rows={[]} emptyText="Nothing matches these filters." />;
