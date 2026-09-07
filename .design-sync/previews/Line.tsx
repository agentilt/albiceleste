import { FollowButton, Line, RankArrow, StateWord, Tag } from "@albiceleste/ui";

export const FollowedPlayer = () => (
  <Line
    primary={<a className="link" href="/es/players/Q30881092">Lisandro Martínez</a>}
    segments={[
      "Manchester United, Premier League",
      <>DEF 13 <RankArrow change={60} className="text-xs" /></>,
      <StateWord key="s" label="Titular fijo" tone="strong" />,
      <Tag key="t" tone="accent">lista</Tag>,
      "6 sept @ Everton 2–2, 90′ titular",
      "Próximo: vs Manchester City, dom 13 sept, 12:30",
      "subió del 50 al 13 entre los defensores en 28 días",
    ]}
    right={<FollowButton pressed onClick={() => {}} compact />}
  />
);

export const WithNoteExcerpt = () => (
  <Line
    primary={<a className="link" href="/es/players/Q166317">Paulo Dybala</a>}
    segments={["AS Roma, Serie A", <>DEL 2 <RankArrow change={9} className="text-xs" /></>, <StateWord key="s" label="En racha" tone="strong" />, <span key="n" className="text-muted">✎ Muy bien en el último mes, ver el rol sin Soulé…</span>]}
    right={<button type="button" className="text-xs text-muted">Quitar</button>}
  />
);

export const Several = () => (
  <div>
    <FollowedPlayer />
    <WithNoteExcerpt />
    <Line primary="Nahuel Tenaglia" segments={["Alavés, La Liga", <>DEF 1 <RankArrow change={1} className="text-xs" /></>, <StateWord key="s" label="Titular fijo" tone="strong" />]} />
  </div>
);
