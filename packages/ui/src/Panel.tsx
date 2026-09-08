import type { ReactNode } from "react";

/**
 * Dashboard panel: a white box on the paper ground with a mono title bar (stripe mark, title, right-hand aside) and a padded
 * body. Panels tile a screen; sections stack a page. Keep bodies dense: numbers, short lines, no paragraphs.
 */
export function Panel({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col border border-rule-strong bg-surface ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-rule px-3 py-1.5">
        <h2 className="flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wide text-ink">
          <span className="stripe" aria-hidden="true" style={{ width: "0.7rem", height: "0.7rem" }} />
          {title}
        </h2>
        {aside && <div className="min-w-0 truncate text-xs text-muted">{aside}</div>}
      </header>
      <div className="min-w-0 flex-1 px-3 py-2">{children}</div>
    </section>
  );
}

/** A big number with a small label, for a row of figures inside a panel. */
export function Figure({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <div className="num font-display text-3xl font-black leading-none text-ink">{value}</div>
      <div className="mt-1 text-xs leading-tight text-muted">{label}</div>
    </div>
  );
}
