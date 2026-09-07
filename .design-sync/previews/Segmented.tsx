import { useState } from "react";
import { Segmented } from "@albiceleste/ui";

export const View = () => (
  <Segmented
    options={[
      { value: "depth", label: "Por puesto" },
      { value: "flat", label: "Lista" },
    ]}
    value="depth"
    onChange={() => {}}
    label="Vista"
  />
);

export const Periods = () => (
  <Segmented
    options={[
      { value: "7", label: "7 días" },
      { value: "14", label: "14 días" },
      { value: "28", label: "28 días" },
      { value: "window", label: "Desde la última lista" },
    ]}
    value="28"
    onChange={() => {}}
  />
);

export const Interactive = () => {
  const [v, setV] = useState("importance");
  return (
    <Segmented
      options={[
        { value: "importance", label: "Por importancia" },
        { value: "date", label: "Por fecha" },
      ]}
      value={v}
      onChange={setV}
    />
  );
};
