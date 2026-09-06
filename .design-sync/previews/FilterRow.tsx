import { Chip, FilterRow } from "@albiceleste/ui";

export const Competitions = () => (
  <FilterRow label="Competition">
    {["Premier League", "La Liga", "Bundesliga", "Serie A", "Brasileirão Série A", "Ligue 1", "Liga Profesional"].map((c, i) => (
      <Chip key={c} pressed={i === 1} onClick={() => {}}>
        {c}
      </Chip>
    ))}
  </FilterRow>
);

export const WithCount = () => (
  <FilterRow label="Position">
    {["GK", "DEF", "MID", "FWD"].map((c) => (
      <Chip key={c} pressed={c === "MID"} onClick={() => {}}>
        {c}
      </Chip>
    ))}
    <span className="ml-2 text-muted">118 players</span>
  </FilterRow>
);
