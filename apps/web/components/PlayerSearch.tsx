"use client";

import { SearchInput, type SearchHit } from "@albiceleste/ui";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { playerHref } from "@/lib/format";

interface Entry {
  key: string;
  name: string;
  team: string | null;
  competition: string | null;
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Header search: loads the static player index on first use, filters with accent folding, navigates on select. */
export function PlayerSearch() {
  const router = useRouter();
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (index || q.length === 0) return;
    fetch("/players/index.json")
      .then((r) => r.json())
      .then((d: Entry[]) => setIndex(d))
      .catch(() => setIndex([]));
  }, [index, q]);

  const hits = useMemo<SearchHit[]>(() => {
    if (!index || q.trim().length < 2) return [];
    const parts = fold(q.trim()).split(/\s+/);
    return index
      .filter((e) => parts.every((p) => fold(`${e.name} ${e.team ?? ""}`).includes(p)))
      .slice(0, 8)
      .map((e) => ({ key: e.key, name: e.name, detail: e.team }));
  }, [index, q]);

  return (
    <SearchInput
      value={q}
      onChange={setQ}
      hits={hits}
      align="right"
      onSelect={(h) => {
        setQ("");
        router.push(playerHref(h.key));
      }}
    />
  );
}
