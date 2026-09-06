import { MinutesTimeline } from "@albiceleste/ui";

/** A season of a rotation player: bench spells, a run of starts, a substitute stretch. */
const MATCHES = [
  ["2025-08-16", 0, false], ["2025-08-23", 12, false], ["2025-08-30", 0, false], ["2025-09-13", 25, false], ["2025-09-20", 90, true],
  ["2025-09-27", 90, true], ["2025-10-04", 78, true], ["2025-10-18", 90, true], ["2025-10-25", 45, false], ["2025-11-01", 90, true],
  ["2025-11-08", 90, true], ["2025-11-22", 66, true], ["2025-11-29", 0, false], ["2025-12-06", 20, false], ["2025-12-13", 90, true],
  ["2026-01-10", 90, true], ["2026-01-17", 90, true], ["2026-01-24", 84, true], ["2026-01-31", 90, true], ["2026-02-07", 30, false],
  ["2026-02-14", 0, false], ["2026-02-21", 15, false], ["2026-03-01", 90, true], ["2026-03-08", 90, true], ["2026-03-15", 90, true],
  ["2026-04-04", 71, true], ["2026-04-11", 90, true], ["2026-04-18", 45, false], ["2026-05-02", 90, true], ["2026-05-09", 90, true],
] as const;

export const Season = () => <MinutesTimeline points={MATCHES.map(([date, minutes, starter]) => ({ date, minutes, starter }))} />;

export const FewMatches = () => (
  <MinutesTimeline
    points={[
      { date: "2026-08-15", minutes: 90, starter: true },
      { date: "2026-08-22", minutes: 90, starter: true },
      { date: "2026-08-29", minutes: 61, starter: true },
      { date: "2026-09-05", minutes: 28, starter: false },
    ]}
  />
);
