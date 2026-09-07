import type { ReactNode } from "react";
import { DefaultLink, type LinkLike } from "./link";

/** Rank movement since the reference date: ▲ 3, ▼ 2, = for no change, nothing when unknown. */
export function RankArrow({ change, className = "" }: { change: number | null | undefined; className?: string }) {
  if (change === null || change === undefined) return <span className={`num text-muted ${className}`}>·</span>;
  if (change === 0) return <span className={`num text-muted ${className}`}>=</span>;
  const up = change > 0;
  return (
    <span className={`num whitespace-nowrap ${up ? "text-celeste-deep" : "text-ink-2"} ${className}`} aria-label={`${up ? "up" : "down"} ${Math.abs(change)}`}>
      {up ? "▲" : "▼"} {Math.abs(change)}
    </span>
  );
}

export type StateTone = "out" | "strong" | "up" | "down" | "quiet" | "new";

/** The one-word form state. `tone` decides the weight; the label is the caller's, in the reader's language. */
export function StateWord({ label, tone = "quiet" }: { label: string; tone?: StateTone }) {
  const cls =
    tone === "out" ? "text-danger" : tone === "strong" ? "font-medium text-ink" : tone === "up" ? "text-celeste-deep" : tone === "down" ? "text-ink-2" : tone === "new" ? "text-gold" : "text-muted";
  return <span className={`whitespace-nowrap text-sm ${cls}`}>{label}</span>;
}

/** Small monospace mark: last-squad membership, availability, a note count. */
export function Tag({ children, tone = "muted", title }: { children: ReactNode; tone?: "accent" | "muted" | "danger"; title?: string }) {
  const cls = tone === "accent" ? "text-celeste-deep" : tone === "danger" ? "text-danger" : "text-muted";
  return (
    <span title={title} className={`font-mono text-[11px] uppercase tracking-wide ${cls}`}>
      {children}
    </span>
  );
}

export interface RankListRow {
  key: string;
  rank: number | null;
  change: number | null;
  name: string;
  href?: string;
  club: string | null;
  /** short qualifier after the club (competition, minutes this season) */
  meta?: ReactNode;
  /** state word, marks, follow button */
  right?: ReactNode;
}

/**
 * One position group of the depth chart: rank, arrow, name, club and meta on one dense line each.
 * Used at four-deep on Home and at full depth on Pool.
 */
export function RankList({ title, rows, aside, LinkComponent = DefaultLink, empty = "—" }: { title: string; rows: RankListRow[]; aside?: ReactNode; LinkComponent?: LinkLike; empty?: string }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-rule-strong pb-1">
        <h3 className="font-sans text-xs font-medium uppercase tracking-wide text-muted">{title}</h3>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </div>
      {rows.length === 0 && <p className="py-2 text-sm text-muted">{empty}</p>}
      <ol className="text-sm">
        {rows.map((r) => (
          <li key={r.key} className="grid grid-cols-[1.75rem_2.5rem_1fr_auto] items-baseline gap-x-2 border-b border-rule py-1.5">
            <span className="num text-right text-muted">{r.rank ?? "–"}</span>
            <RankArrow change={r.change} className="text-xs" />
            <span className="min-w-0">
              {r.href ? (
                <LinkComponent href={r.href} className="link font-medium">
                  {r.name}
                </LinkComponent>
              ) : (
                <span className="font-medium">{r.name}</span>
              )}
              {r.club && <span className="text-ink-2"> · {r.club}</span>}
              {r.meta && <span className="text-muted"> · {r.meta}</span>}
            </span>
            <span className="flex items-baseline gap-2 whitespace-nowrap">{r.right}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** A dense one-line record: a primary link, dot-separated segments, an optional right-hand slot. The follow list is made of these. */
export function Line({ primary, segments, right }: { primary: ReactNode; segments: ReactNode[]; right?: ReactNode }) {
  const parts = segments.filter((s) => s !== null && s !== undefined && s !== "");
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-rule py-2 text-sm">
      <div className="min-w-0">
        <span className="font-medium">{primary}</span>
        {parts.map((s, i) => (
          <span key={i} className="text-ink-2">
            {" · "}
            {s}
          </span>
        ))}
      </div>
      {right && <div className="flex shrink-0 items-baseline gap-2">{right}</div>}
    </div>
  );
}
