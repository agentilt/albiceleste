"use client";

import { useEffect, useRef, useState } from "react";

export interface SearchHit {
  key: string;
  name: string;
  detail?: string | null;
}

/**
 * Search box with a results dropdown. Controlled: the host owns the query and the hit list; this component handles
 * open/close, keyboard navigation (arrows, enter, escape) and click-outside.
 */
export function SearchInput({
  value,
  onChange,
  hits,
  onSelect,
  placeholder = "Find a player",
  width = "w-56",
  defaultOpen = false,
  align = "left",
}: {
  value: string;
  onChange: (q: string) => void;
  hits: SearchHit[];
  onSelect: (hit: SearchHit) => void;
  placeholder?: string;
  width?: string;
  /** Start with the results list open (useful for static previews and demos). */
  defaultOpen?: boolean;
  /** Which edge of the input the results list hangs from; use "right" when the box sits at a container's right edge. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(h: SearchHit) {
    setOpen(false);
    onSelect(h);
  }

  return (
    <div ref={box} className="relative inline-block">
      <input
        type="search"
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${width} text-sm`}
        value={value}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActive(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") setActive((a) => Math.min(a + 1, hits.length - 1));
          else if (e.key === "ArrowUp") setActive((a) => Math.max(a - 1, 0));
          else if (e.key === "Enter" && hits[active]) pick(hits[active]);
          else if (e.key === "Escape") setOpen(false);
        }}
      />
      {open && hits.length > 0 && (
        <ul className={`absolute ${align === "right" ? "right-0" : "left-0"} z-20 mt-1 w-80 border border-rule-strong bg-surface text-sm shadow-sm`}>
          {hits.map((h, i) => (
            <li key={h.key}>
              <button
                type="button"
                className={`flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left ${i === active ? "bg-celeste-tint" : ""}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(h)}
              >
                <span>{h.name}</span>
                <span className="truncate text-xs text-muted">{h.detail ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
