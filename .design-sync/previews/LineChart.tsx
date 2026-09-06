import { LineChart, eur } from "@albiceleste/ui";

export const MarketValue = () => (
  <LineChart
    format={eur}
    yLabel="market value"
    points={[
      { x: "2022-06-20", y: 4000000 },
      { x: "2022-12-19", y: 12000000 },
      { x: "2023-06-13", y: 25000000 },
      { x: "2023-12-14", y: 35000000 },
      { x: "2024-06-10", y: 50000000 },
      { x: "2024-12-16", y: 60000000 },
      { x: "2025-06-04", y: 80000000 },
      { x: "2025-12-15", y: 90000000 },
      { x: "2026-06-03", y: 90000000 },
    ]}
  />
);

export const ExportsPerYear = () => (
  <LineChart
    points={[
      { x: 2016, y: 61 },
      { x: 2017, y: 74 },
      { x: 2018, y: 80 },
      { x: 2019, y: 92 },
      { x: 2020, y: 55 },
      { x: 2021, y: 78 },
      { x: 2022, y: 96 },
      { x: 2023, y: 88 },
      { x: 2024, y: 103 },
      { x: 2025, y: 97 },
    ]}
  />
);
