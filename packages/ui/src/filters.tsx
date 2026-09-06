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
