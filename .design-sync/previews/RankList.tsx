import { FollowButton, RankList, StateWord, Tag } from "@albiceleste/ui";

const ROWS = [
  { key: "Q1", rank: 1, change: 1, name: "Nahuel Tenaglia", href: "/es/players/Q1", club: "Alavés", meta: "360′", right: <FollowButton pressed={false} onClick={() => {}} compact /> },
  { key: "Q2", rank: 2, change: 2, name: "Mariano Troilo", href: "/es/players/Q2", club: "Parma", meta: "265′", right: <FollowButton pressed onClick={() => {}} compact /> },
  { key: "Q3", rank: 3, change: 23, name: "Santiago Ramos", href: "/es/players/Q3", club: "Bahia", meta: "2.115′", right: <FollowButton pressed={false} onClick={() => {}} compact /> },
  { key: "Q4", rank: 13, change: 60, name: "Lisandro Martínez", href: "/es/players/Q4", club: "Manchester United", meta: "180′", right: <><Tag tone="accent">lista</Tag><FollowButton pressed={false} onClick={() => {}} compact /></> },
];

export const Defenders = () => <RankList title="Defensores" rows={ROWS} aside="por ranking" />;

export const WithStates = () => (
  <RankList
    title="Delanteros"
    rows={[
      { key: "F1", rank: 1, change: 3, name: "Mateo Pellegrino", club: "Fiorentina", right: <StateWord label="Recién llegado" tone="new" /> },
      { key: "F2", rank: 2, change: 9, name: "Paulo Dybala", club: "AS Roma", right: <StateWord label="En racha" tone="strong" /> },
      { key: "F3", rank: 3, change: -2, name: "Giovanni Simeone", club: "Torino", right: <StateWord label="En baja" tone="down" /> },
    ]}
  />
);

export const Empty = () => <RankList title="Arqueros" rows={[]} empty="Nadie con ranking." />;

export const FourColumns = () => (
  <div className="grid gap-6 grid-cols-4">
    <RankList title="Arqueros" rows={ROWS.slice(0, 2)} />
    <RankList title="Defensores" rows={ROWS} />
    <RankList title="Mediocampistas" rows={ROWS.slice(1, 4)} />
    <RankList title="Delanteros" rows={ROWS.slice(0, 3)} />
  </div>
);
