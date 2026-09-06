import { Bars, eur } from "@albiceleste/ui";

export const PlayersByCompetition = () => (
  <Bars
    data={[
      { label: "Brasileirão Série A", value: 49 },
      { label: "La Liga", value: 24 },
      { label: "Serie A", value: 24 },
      { label: "Premier League", value: 15 },
      { label: "Ligue 1", value: 6 },
      { label: "Bundesliga", value: 4 },
    ]}
  />
);

export const FeesByDestination = () => (
  <Bars
    format={eur}
    data={[
      { label: "Italy", value: 212000000 },
      { label: "Spain", value: 148500000 },
      { label: "England", value: 131000000 },
      { label: "Portugal", value: 64000000 },
      { label: "Mexico", value: 22000000 },
    ]}
  />
);
