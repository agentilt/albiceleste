import { Radar } from "@albiceleste/ui";

const DEF_AXES = [
  { key: "minutes_share", label: "Minutos" },
  { key: "starts_share", label: "Titularidades" },
  { key: "competition_w", label: "Nivel" },
  { key: "clean_sheet_rate", label: "Vallas invictas" },
  { key: "conceded_per90", label: "Goles en contra" },
  { key: "trend", label: "Tendencia 28 d" },
];

export const TwoDefenders = () => (
  <Radar
    axes={DEF_AXES}
    series={[
      { name: "Lisandro Martínez", values: [68, 67, 98, 6, 17, 76] },
      { name: "Nahuel Tenaglia", values: [97, 95, 98, 87, 93, 76] },
    ]}
  />
);

export const FourForwards = () => (
  <Radar
    axes={[
      { key: "minutes_share", label: "Minutos" },
      { key: "starts_share", label: "Titularidades" },
      { key: "competition_w", label: "Nivel" },
      { key: "ga_per90", label: "Producción/90" },
      { key: "trend", label: "Tendencia 28 d" },
    ]}
    series={[
      { name: "Paulo Dybala", values: [94, 96, 98, 88, 70] },
      { name: "Lautaro Martínez", values: [72, 80, 98, 91, 40] },
      { name: "Julián Álvarez", values: [25, 17, 96, null, 70] },
      { name: "Alejo Veliz", values: [90, 92, 60, 75, 85] },
    ]}
    size={420}
  />
);

export const Single = () => <Radar axes={DEF_AXES} series={[{ name: "Mariano Troilo", values: [94, 95, 98, 6, 47, 76] }]} size={320} />;
