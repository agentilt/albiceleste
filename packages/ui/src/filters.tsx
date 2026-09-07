"use client";

import type { ReactNode } from "react";

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
      <span className="w-24 text-xs uppercase tracking-wide text-muted">{label}</span>
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
      <span className="text-xs uppercase tracking-wide text-muted">{label}</span>
      {children}
    </label>
  );
}

/** Single-choice switch (depth chart / flat list, importance / date): chips where exactly one is pressed. */
export function Segmented<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="inline-flex flex-wrap items-center gap-1" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} className="chip" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
