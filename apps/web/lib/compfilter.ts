"use client";

/**
 * The shared competition filter: the selection lives in the URL (`comp=`) so views can be shared, and the last selection is
 * remembered in the browser as the default when a list page opens without one. Clearing removes both.
 */
import { useCallback, useEffect, useState } from "react";
import { listParam, useUrlState } from "./urlstate";

export const PRESETS: Record<"top5" | "sudamerica" | "resto", string[]> = {
  top5: ["eng.1", "esp.1", "ger.1", "ita.1", "fra.1"],
  sudamerica: ["arg.1", "bra.1"],
  resto: ["usa.1", "por.1", "mex.1", "ksa.1", "tur.1", "ned.1", "bel.1"],
};

const KEY = "albiceleste.comp";

function readStored(): string[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function writeStored(v: string[]) {
  try {
    if (v.length) window.localStorage.setItem(KEY, JSON.stringify(v));
    else window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

export function useCompetitionFilter() {
  const { get, set } = useUrlState();
  const fromUrl = listParam(get("comp"));
  const [stored, setStored] = useState<string[]>([]);
  useEffect(() => {
    setStored(readStored());
  }, []);
  const selected = fromUrl.length ? fromUrl : stored;
  const remembered = fromUrl.length === 0 && stored.length > 0;
  const update = useCallback(
    (v: string[]) => {
      writeStored(v);
      setStored(v);
      set({ comp: v.join(",") });
    },
    [set],
  );
  return {
    selected,
    remembered,
    toggle: (league: string) => update(selected.includes(league) ? selected.filter((x) => x !== league) : [...selected, league]),
    setAll: (v: string[]) => update(v),
    clear: () => update([]),
    matches: (league: string | null | undefined) => selected.length === 0 || (!!league && selected.includes(league)),
  };
}
