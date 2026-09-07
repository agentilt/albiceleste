import type { SelectionWindow } from "@albiceleste/data";
import { daysBetween } from "./fmt";

export type Countdown =
  | { kind: "before"; window: SelectionWindow; days: number; expected: boolean; last: SelectionWindow | null }
  | { kind: "announced"; window: SelectionWindow; last: SelectionWindow | null }
  | { kind: "in_window"; window: SelectionWindow }
  | { kind: "next_only"; window: SelectionWindow }
  | { kind: "none" };

/** Where the calendar stands on `today` (YYYY-MM-DD, build date). */
export function countdown(windows: SelectionWindow[], today: string): Countdown {
  const sorted = [...windows].sort((a, b) => a.starts.localeCompare(b.starts));
  const active = sorted.find((w) => w.starts <= today && today <= w.ends);
  if (active) return { kind: "in_window", window: active };
  const last = [...sorted].reverse().find((w) => w.announcement_date && w.announcement_date <= today && w.listed > 0) ?? null;
  const next = sorted.find((w) => w.starts > today);
  if (!next) return { kind: "none" };
  if (next.announcement_date && next.announcement_date >= today) {
    return { kind: "before", window: next, days: daysBetween(today, next.announcement_date), expected: next.announcement_status !== "official", last };
  }
  if (next.announcement_date && next.listed > 0) return { kind: "announced", window: next, last };
  return { kind: "next_only", window: next };
}

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
