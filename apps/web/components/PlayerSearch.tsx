"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

interface Entry {
  key: string;
  name: string;
  team: string | null;
  competition: string | null;
}

function fold(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

export function PlayerSearch() {
  const router = useRouter();
  const [index, setIndex] = useState<Entry[] | null>(null);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || index) return;
    fetch("/players/index.json")
      .then((r) => r.json())
      .then((d: Entry[]) => setIndex(d))
      .catch(() => setIndex([]));
  }, [open, index]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const hits = useMemo(() => {
    if (!index || q.trim().length < 2) return [];
    const needle = fold(q.trim());
    const parts = needle.split(/\s+/);
    return index.filter((e) => parts.every((p) => fold(`${e.name} ${e.team ?? ""}`).includes(p))).slice(0, 8);
  }, [index, q]);

  function go(e: Entry) {
    setOpen(false);
    setQ("");
    router.push(`/players/${encodeURIComponent(e.key)}`);
  }

  return (
    <div ref={box} className="relative">
      <input
        type="search"
        placeholder="Find a player"
        aria-label="Find a player"
        className="w-56 text-sm"
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && hits[active]) go(hits[active]);
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <ul className="absolute right-0 z-20 mt-1 w-80 border border-rule-strong bg-surface text-sm shadow-sm">
          {hits.map((h, i) => (
            <li key={h.key}>
              <button
                type="button"
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left ${i === active ? "bg-celeste-tint" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(h)}
              >
                <span>{h.name}</span>
                <span className="truncate text-xs text-muted">{h.team ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
