import { SearchInput, type SearchHit } from "@albiceleste/ui";
import { useState } from "react";

const INDEX: SearchHit[] = [
  { key: "Q1", name: "Julián Álvarez", detail: "Atlético Madrid" },
  { key: "Q2", name: "Alexis Mac Allister", detail: "Liverpool" },
  { key: "Q3", name: "Enzo Fernández", detail: "Chelsea" },
  { key: "Q4", name: "Lautaro Martínez", detail: "Inter" },
  { key: "Q5", name: "Nicolás González", detail: "Juventus" },
];

export const Empty = () => <SearchInput value="" onChange={() => {}} hits={[]} onSelect={() => {}} />;

export const Typing = () => {
  const [q, setQ] = useState("mart");
  const hits = INDEX.filter((h) => h.name.toLowerCase().includes(q.toLowerCase()));
  return <SearchInput value={q} onChange={setQ} hits={hits} onSelect={(h) => setQ(h.name)} defaultOpen />;
};
