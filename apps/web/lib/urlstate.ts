"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Route } from "next";
import { useCallback } from "react";

/** Read and write view state in the query string, so a view can be shared. Static page, client-only state. */
export function useUrlState() {
  const sp = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const get = useCallback((k: string) => sp.get(k), [sp]);
  const set = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(sp.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const q = next.toString();
      router.replace((q ? `${path}?${q}` : path) as Route, { scroll: false });
    },
    [sp, router, path],
  );
  return { get, set, all: sp };
}

export function listParam(v: string | null): string[] {
  return v ? v.split(",").filter(Boolean) : [];
}

export function boolParam(v: string | null, dflt = false): boolean {
  return v === null ? dflt : v === "1";
}

export function numParam(v: string | null, dflt: number): number {
  const n = v === null ? NaN : Number(v);
  return Number.isFinite(n) ? n : dflt;
}
