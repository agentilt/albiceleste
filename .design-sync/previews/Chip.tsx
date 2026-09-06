import { Chip } from "@albiceleste/ui";
import { useState } from "react";

export const States = () => (
  <div className="flex flex-wrap gap-2">
    <Chip pressed={false} onClick={() => {}}>
      Premier League
    </Chip>
    <Chip pressed={true} onClick={() => {}}>
      La Liga
    </Chip>
    <Chip pressed={false} onClick={() => {}}>
      Brasileirão Série A
    </Chip>
  </div>
);

export const Interactive = () => {
  const [on, setOn] = useState<string[]>(["Forward"]);
  const toggle = (v: string) => setOn(on.includes(v) ? on.filter((x) => x !== v) : [...on, v]);
  return (
    <div className="flex flex-wrap gap-2">
      {["Goalkeeper", "Defender", "Midfielder", "Forward"].map((p) => (
        <Chip key={p} pressed={on.includes(p)} onClick={() => toggle(p)}>
          {p}
        </Chip>
      ))}
    </div>
  );
};
