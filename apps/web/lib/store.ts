"use client";

/**
 * The personal layer: follow list and notes in localStorage, read through useSyncExternalStore so every component on a page
 * updates together. Nothing here leaves the browser. Export/import are plain JSON files.
 */
import { useSyncExternalStore } from "react";

export interface Note {
  id: string;
  player_key: string;
  match_key?: string | null;
  match_label?: string | null;
  date: string; // ISO
  text: string;
  verdict?: string | null;
}

interface Store {
  follows: string[];
  notes: Note[];
}

const KEY = "albiceleste.board.v1";
const EMPTY: Store = { follows: [], notes: [] };
let cache: Store | null = null;
const listeners = new Set<() => void>();

function read(): Store {
  if (cache) return cache;
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? normalize(JSON.parse(raw)) : { follows: [], notes: [] };
  } catch {
    cache = { follows: [], notes: [] };
  }
  return cache;
}

function normalize(x: unknown): Store {
  const o = (x ?? {}) as Partial<Store>;
  const follows = Array.isArray(o.follows) ? o.follows.filter((k): k is string => typeof k === "string") : [];
  const notes = Array.isArray(o.notes)
    ? o.notes.filter((n): n is Note => !!n && typeof n === "object" && typeof (n as Note).id === "string" && typeof (n as Note).player_key === "string" && typeof (n as Note).text === "string")
    : [];
  return { follows: Array.from(new Set(follows)), notes };
}

function write(next: Store) {
  cache = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // storage full or blocked: keep the in-memory copy
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      l();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", onStorage);
  };
}

export function useStore(): Store {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useFollows() {
  const s = useStore();
  return {
    follows: s.follows,
    isFollowed: (k: string) => s.follows.includes(k),
    toggle: (k: string) => write({ ...read(), follows: read().follows.includes(k) ? read().follows.filter((x) => x !== k) : [...read().follows, k] }),
    remove: (k: string) => write({ ...read(), follows: read().follows.filter((x) => x !== k) }),
    set: (keys: string[]) => write({ ...read(), follows: Array.from(new Set(keys)) }),
    merge: (keys: string[]) => write({ ...read(), follows: Array.from(new Set([...read().follows, ...keys])) }),
  };
}

export function useNotes() {
  const s = useStore();
  return {
    notes: s.notes,
    forPlayer: (k: string) => s.notes.filter((n) => n.player_key === k).sort((a, b) => b.date.localeCompare(a.date)),
    countFor: (k: string) => s.notes.filter((n) => n.player_key === k).length,
    add: (n: Omit<Note, "id" | "date"> & { date?: string }) =>
      write({ ...read(), notes: [...read().notes, { ...n, id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, date: n.date ?? new Date().toISOString() }] }),
    edit: (id: string, text: string, verdict: string | null) => write({ ...read(), notes: read().notes.map((x) => (x.id === id ? { ...x, text, verdict } : x)) }),
    remove: (id: string) => write({ ...read(), notes: read().notes.filter((x) => x.id !== id) }),
  };
}

export function exportStore(): string {
  return JSON.stringify({ app: "albiceleste", version: 1, exported_at: new Date().toISOString(), ...read() }, null, 2);
}

export function importStore(text: string): { follows: number; notes: number } | null {
  try {
    const parsed = normalize(JSON.parse(text));
    if (parsed.follows.length === 0 && parsed.notes.length === 0) return null;
    const cur = read();
    const ids = new Set(cur.notes.map((n) => n.id));
    write({ follows: Array.from(new Set([...cur.follows, ...parsed.follows])), notes: [...cur.notes, ...parsed.notes.filter((n) => !ids.has(n.id))] });
    return { follows: parsed.follows.length, notes: parsed.notes.length };
  } catch {
    return null;
  }
}

/** Share link: keys joined by commas in the `follow` parameter. */
export function encodeShare(keys: string[]): string {
  return keys.map(encodeURIComponent).join(",");
}

export function decodeShare(v: string | null): string[] {
  if (!v) return [];
  return v.split(",").map((k) => decodeURIComponent(k)).filter(Boolean);
}
