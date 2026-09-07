import { AgeScatter } from "@albiceleste/ui";

const BAND = [16, 17, 18, 19, 20, 21, 22, 23].map((age, i) => ({ age, p25: 0, p50: [0, 0, 0, 0.01, 0.02, 0.04, 0.06, 0.1][i]!, p75: [0.01, 0.02, 0.05, 0.08, 0.12, 0.18, 0.25, 0.3][i]!, p90: [0.05, 0.1, 0.2, 0.3, 0.4, 0.48, 0.5, 0.52][i]! }));

const POINTS = [
  { key: "a", label: "Franco Mastantuono (Fiorentina)", age: 19, value: 0.73, followed: true, href: "/es/players/a" },
  { key: "b", label: "Gianluca Prestianni (Benfica)", age: 20, value: 0.66 },
  { key: "c", label: "Álvaro Montoro (Botafogo)", age: 19, value: 0.6 },
  { key: "d", label: "Luca Regiardo (Newell's)", age: 19, value: 0.6 },
  { key: "e", label: "Ian Subiabre (River)", age: 19, value: 0.2 },
  { key: "f", label: "Tobías Andrada (Vélez)", age: 18, value: 0.08 },
  { key: "g", label: "Santiago López (Independiente)", age: 21, value: 0.35 },
  { key: "h", label: "Valentín Carboni (Genoa)", age: 21, value: 0.52 },
  { key: "i", label: "Claudio Echeverri (Leverkusen)", age: 20, value: 0.45 },
  { key: "j", label: "Aaron Anselmino (Chelsea)", age: 21, value: 0.1 },
  { key: "k", label: "Juan Villalba (Vélez)", age: 22, value: 0.55 },
  { key: "l", label: "Kevin Zenón (Boca)", age: 23, value: 0.4 },
];

export const Forwards = () => <AgeScatter points={POINTS} band={BAND} yLabel="índice de actividad" />;
export const Narrow = () => <AgeScatter points={POINTS.slice(0, 6)} band={BAND} width={300} height={200} />;
export const Empty = () => <AgeScatter points={[]} band={BAND} />;
