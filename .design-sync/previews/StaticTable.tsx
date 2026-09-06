import { StaticTable, int, pct } from "@albiceleste/ui";

interface Mover {
  player_key: string;
  full_name: string;
  team: string;
  competition: string;
  minutes: number;
  prev_minutes: number;
  minutes_change_pct: number;
  starts: number;
  prev_starts: number;
  minutes_share_pct: number;
}

const MOVERS: Mover[] = [
  { player_key: "Q1", full_name: "José Manuel López", team: "Palmeiras", competition: "Brasileirão Série A", minutes: 302, prev_minutes: 45, minutes_change_pct: 571, starts: 3, prev_starts: 0, minutes_share_pct: 84 },
  { player_key: "Q2", full_name: "Agustín Giay", team: "Palmeiras", competition: "Brasileirão Série A", minutes: 276, prev_minutes: 59, minutes_change_pct: 368, starts: 3, prev_starts: 1, minutes_share_pct: 77 },
  { player_key: "Q3", full_name: "Kevin Lomónaco", team: "Elche", competition: "La Liga", minutes: 360, prev_minutes: 117, minutes_change_pct: 208, starts: 4, prev_starts: 1, minutes_share_pct: 57 },
  { player_key: "Q4", full_name: "Lucas Esquivel", team: "Athletico-PR", competition: "Brasileirão Série A", minutes: 0, prev_minutes: 180, minutes_change_pct: -100, starts: 0, prev_starts: 2, minutes_share_pct: 0 },
  { player_key: "Q5", full_name: "Wálter Kannemann", team: "Grêmio", competition: "Brasileirão Série A", minutes: 45, prev_minutes: 180, minutes_change_pct: -75, starts: 0, prev_starts: 2, minutes_share_pct: 17 },
];

export const Movers = () => (
  <StaticTable
    rows={MOVERS}
    rowKey={(r) => r.player_key}
    cols={[
      {
        label: "Player",
        render: (r) => (
          <a className="link" href={`/players/${r.player_key}`}>
            {r.full_name}
          </a>
        ),
      },
      { label: "Club", render: (r) => r.team },
      { label: "Competition", render: (r) => r.competition },
      { label: "Minutes", align: "r", render: (r) => int(r.minutes) },
      { label: "Prev 28d", align: "r", render: (r) => int(r.prev_minutes) },
      { label: "Change", align: "r", render: (r) => pct(r.minutes_change_pct, true) },
      { label: "Starts", align: "r", render: (r) => `${int(r.starts)} / ${int(r.prev_starts)}` },
      { label: "Team-minute share", align: "r", render: (r) => pct(r.minutes_share_pct) },
    ]}
  />
);

export const Empty = () => (
  <StaticTable
    rows={[] as Mover[]}
    rowKey={(r) => r.player_key}
    empty="No Transfermarkt history matched."
    cols={[
      { label: "Season", render: (r) => r.team },
      { label: "Club", render: (r) => r.team },
      { label: "Apps", align: "r", render: (r) => int(r.starts) },
    ]}
  />
);
