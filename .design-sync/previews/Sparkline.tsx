import { Sparkline } from "@albiceleste/ui";

const DOMAIN: [string, string] = ["2026-05-10", "2026-09-07"];
const A = [
  { date: "2026-05-17", minutes: 90, starter: true },
  { date: "2026-05-24", minutes: 90, starter: true },
  { date: "2026-08-15", minutes: 0, starter: false },
  { date: "2026-08-22", minutes: 90, starter: true },
  { date: "2026-08-30", minutes: 90, starter: true },
  { date: "2026-09-06", minutes: 90, starter: true },
];
const B = [
  { date: "2026-05-17", minutes: 20, starter: false },
  { date: "2026-05-24", minutes: 90, starter: true },
  { date: "2026-08-16", minutes: 90, starter: true },
  { date: "2026-08-23", minutes: 75, starter: true },
  { date: "2026-08-30", minutes: 15, starter: false },
  { date: "2026-09-06", minutes: 90, starter: true },
];

export const One = () => <Sparkline points={A} domain={DOMAIN} />;

export const Aligned = () => (
  <table className="data" style={{ maxWidth: 560 }}>
    <tbody>
      <tr>
        <td className="text-muted">Lisandro Martínez</td>
        <td>
          <Sparkline points={A} domain={DOMAIN} />
        </td>
      </tr>
      <tr>
        <td className="text-muted">Nahuel Tenaglia</td>
        <td>
          <Sparkline points={B} domain={DOMAIN} />
        </td>
      </tr>
    </tbody>
  </table>
);
