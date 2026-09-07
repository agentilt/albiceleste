"use client";

import { SearchInput, type SearchHit } from "@albiceleste/ui";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { t, type Locale } from "@/lib/i18n";
import { routes } from "@/lib/routes";

export interface IndexEntry {
  key: string;
  name: string;
  team: string | null;
  competition: string | null;
  pos_group?: string | null;
}

export function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

let indexPromise: Promise<IndexEntry[]> | null = null;
export function loadIndex(): Promise<IndexEntry[]> {
  if (!indexPromise) indexPromise = fetch("/data/index.json").then((r) => r.json()).catch(() => []);
  return indexPromise;
}

export function searchIndex(index: IndexEntry[], q: string, limit = 8): IndexEntry[] {
  if (q.trim().length < 2) return [];
  const parts = fold(q.trim()).split(/\s+/);
  return index.filter((e) => parts.every((p) => fold(`${e.name} ${e.team ?? ""}`).includes(p))).slice(0, limit);
}

/** Header search: loads the static player index on first use, filters with accent folding, navigates on select. */
export function PlayerSearch({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (index || q.length === 0) return;
    loadIndex().then(setIndex);
  }, [index, q]);

  const hits = useMemo<SearchHit[]>(() => (index ? searchIndex(index, q).map((e) => ({ key: e.key, name: e.name, detail: e.team })) : []), [index, q]);

  return (
    <SearchInput
      value={q}
      onChange={setQ}
      hits={hits}
      align="right"
      placeholder={t(locale).search.placeholder}
      onSelect={(h) => {
        setQ("");
        router.push(routes.player(locale, h.key) as Route);
      }}
    />
  );
}
