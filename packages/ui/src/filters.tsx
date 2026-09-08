"use client";

import type { KeyboardEvent, ReactNode } from "react";

/** Toggle chip for multi-select filters. Pressed state inverts to ink. */
export function Chip({ pressed, onClick, children }: { pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="chip" aria-pressed={pressed} onClick={onClick}>
      {children}
    </button>
  );
}

/** A labelled row of filter controls: uppercase label on the left, chips or inputs wrapping on the right. */
export function FilterRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="w-24 font-mono text-[11px] uppercase tracking-wide text-muted">{label}</span>
      {children}
    </div>
  );
}

/** Stack of FilterRows with the spacing the explorer pages use. */
export function FilterBar({ children }: { children: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-3 text-sm">{children}</div>;
}

/** Inline labelled control (select or number input) for a FilterRow. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-2">
      <span className="font-mono text-[11px] uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

/**
 * Single-choice switch (depth chart / flat list, importance / date): a radio group drawn as chips. One tab stop; the
 * arrow keys move the choice. Give it a `label` so assistive tech can name the group.
 */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
    if (!delta || options.length === 0) return;
    e.preventDefault();
    const next = (idx + delta + options.length) % options.length;
    onChange(options[next]!.value);
    e.currentTarget.querySelectorAll<HTMLButtonElement>("button[role=radio]")[next]?.focus();
  }
  return (
    <div className="inline-flex flex-wrap items-center gap-1" role="radiogroup" aria-label={label} onKeyDown={onKey}>
      {options.map((o, i) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} tabIndex={i === idx ? 0 : -1} className="chip" onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
