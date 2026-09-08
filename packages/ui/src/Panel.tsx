import type { ReactNode } from "react";

/**
 * Dashboard panel: a white box on the paper ground with a mono title bar (stripe mark, title, right-hand aside) and a padded
 * body. Panels tile a screen; sections stack a page. Keep bodies dense: numbers, short lines, no paragraphs.
 */
export function Panel({ title, aside, children, className = "" }: { title: string; aside?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col border border-rule-strong bg-surface ${className}`}>
      <header className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2">
        <h2 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-ink">
          <span className="stripe" aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
          {title}
        </h2>
        {aside && <div className="min-w-0 truncate text-sm text-muted">{aside}</div>}
      </header>
      <div className="flex min-w-0 flex-1 flex-col px-4 py-1">{children}</div>
    </section>
  );
}

/**
 * Equal rows that fill the panel: one line each, a fixed minimum height, the list stretches so two panels side by side end
 * level. `left` holds the name and club, `right` the facts; both truncate rather than wrap.
 */
export function PanelRows({ rows }: { rows: { key: string; left: ReactNode; right?: ReactNode }[] }) {
  return (
    <ol className="grid flex-1 auto-rows-fr">
      {rows.map((r) => (
        <li key={r.key} className="flex min-h-10 items-center gap-4 border-b border-rule text-sm last:border-b-0">
          <span className="min-w-0 flex-1 truncate">{r.left}</span>
          {r.right !== undefined && <span className="min-w-0 max-w-[60%] shrink-0 truncate text-right text-ink-2">{r.right}</span>}
        </li>
      ))}
    </ol>
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
