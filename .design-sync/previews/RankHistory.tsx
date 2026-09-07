import { RankHistory } from "@albiceleste/ui";

function series(): { date: string; rank: number | null }[] {
  const out: { date: string; rank: number | null }[] = [];
  const start = new Date("2024-08-05");
  const ranks = [8, 6, 5, 5, 4, 3, 3, 2, 2, 3, 4, 6, 9, 12, 15, 14, 12, 10, 8, 8, 7, 6, 6, 5, 5, 4, 4, 5, 6, 8, 10, 12, 16, 22, 30, 41, 50, 50, 48, 47, 46, 50, 44, 30, 20, 13];
  ranks.forEach((r, i) => {
    const d = new Date(start.getTime() + i * 14 * 86400000);
    out.push({ date: d.toISOString().slice(0, 10), rank: i >= 33 && i <= 36 ? null : r });
  });
  return out;
}

export const Defender = () => (
  <RankHistory
    points={series()}
    windows={[
      { date: "2024-08-26", label: "Sept 2024" },
      { date: "2025-05-26", label: "June 2025" },
      { date: "2026-05-28", label: "Copa del Mundo 2026" },
    ]}
    calls={["2024-08-26", "2026-05-28"]}
    maxRank={60}
  />
);

export const NoWindows = () => <RankHistory points={series().slice(0, 20)} maxRank={20} height={160} />;
