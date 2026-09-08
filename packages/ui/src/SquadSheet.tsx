import type { ReactNode } from "react";
import { Hint } from "./Hint";
import { DefaultLink, type LinkLike } from "./link";

export interface SheetName {
  key: string;
  name: string;
  href?: string;
  club: string | null;
  rank: number | null;
  /** last-squad mark */
  marked?: boolean;
  /** short figures shown on the right of the name (minutes, goals) */
  stats?: ReactNode;
  /** a state word or note in place of stats */
  note?: ReactNode;
}

export interface SheetColumn {
  title: string;
  /** slots in the list for this position (3/9/8/6 for a 26) */
  slots: number;
  names: SheetName[];
  /** what the stats column holds, e.g. "min · G+A" */
  hint?: string;
}

function Cell({ n, small, LinkComponent }: { n: SheetName; small: boolean; LinkComponent: LinkLike }) {
  return (
    <li className={`sheet-row grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-x-2 border-b border-rule ${small ? "h-8 text-sm" : "h-9 text-[15px]"}`}>
      <span className="num font-mono text-[11px] text-muted">{n.rank ?? ""}</span>
      <span className="condensed flex min-w-0 items-baseline gap-1.5 leading-tight">
        {n.href ? (
          <LinkComponent href={n.href} className="min-w-0 truncate font-medium text-ink hover:text-celeste-deep">
            {n.name}
          </LinkComponent>
        ) : (
          <span className="min-w-0 truncate font-medium">{n.name}</span>
        )}
        {n.club && <span className="min-w-0 shrink-[3] truncate text-xs text-muted">{n.club}</span>}
        {n.marked && (
          <span className="shrink-0 text-[10px] text-gold" aria-hidden="true">
            ●
          </span>
        )}
      </span>
      <span className="num whitespace-nowrap font-mono text-xs text-ink-2">{n.note ?? n.stats ?? ""}</span>
    </li>
  );
}

/**
 * The squad sheet: one row per position, as the official list reads. The names flow left to right in cells of equal
 * width, so a position with three players takes three cells and one with eight takes two lines; nothing is blank. When a
 * `secondary` block is given (the challengers), its names for the same position follow on the row after a hairline, in a
 * smaller register.
 */
export function SquadSheet({
  columns,
  caption,
  title,
  aside,
  hint,
  hintHref,
  secondary,
  LinkComponent = DefaultLink,
}: {
  columns: SheetColumn[];
  caption?: ReactNode;
  /** header strip above the rows */
  title?: string;
  aside?: ReactNode;
  /** explanation on hover of a "?" after the title */
  hint?: string;
  hintHref?: string;
  /** a second, smaller block per position: title, its own columns (paired with `columns` by order), an optional note */
  secondary?: { title: string; aside?: ReactNode; hint?: string; columns: SheetColumn[] };
  /** kept for callers; the sheet is dense by design */
  dense?: boolean;
  LinkComponent?: LinkLike;
}) {
  return (
    <figure className="m-0 min-w-0 border-2 border-ink bg-surface">
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2">
          <h2 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-ink">
            <span className="stripe" aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
            {title}
            {hint && <Hint text={hint} href={hintHref} />}
          </h2>
          <div className="flex min-w-0 items-center gap-3 text-xs text-muted">
            {secondary && (
              <span className="hidden items-center gap-1.5 font-mono uppercase tracking-wide sm:flex">
                <span className="inline-block h-2 w-2 border-b border-rule-strong" aria-hidden="true" />
                {secondary.title}
                {secondary.hint && <Hint text={secondary.hint} href={hintHref} />}
              </span>
            )}
            {aside && <span className="hidden min-w-0 truncate sm:block">{aside}</span>}
          </div>
        </div>
      )}
      <div className="px-3 pb-2">
        {columns.map((col, ci) => {
          const sec = secondary?.columns[ci];
          return (
            <div key={col.title} className="border-b border-rule-strong py-2 last:border-b-0">
              <div className="flex items-baseline justify-between gap-3 font-mono text-xs uppercase tracking-wide text-muted">
                <span className="whitespace-nowrap">
                  {col.title} <span className="num">{col.slots}</span>
                </span>
                {col.hint && <span className="whitespace-nowrap normal-case tracking-normal">{col.hint}</span>}
              </div>
              <ol className="grid gap-x-5 sm:grid-cols-2 lg:grid-cols-4">
                {col.names.slice(0, col.slots).map((n) => (
                  <Cell key={n.key} n={n} small={false} LinkComponent={LinkComponent} />
                ))}
              </ol>
              {sec && sec.names.length > 0 && (
                <ol className="mt-1.5 grid gap-x-5 border-t border-rule-strong pt-1 sm:grid-cols-2 lg:grid-cols-4">
                  {sec.names.slice(0, sec.slots).map((n) => (
                    <Cell key={n.key} n={n} small LinkComponent={LinkComponent} />
                  ))}
                </ol>
              )}
            </div>
          );
        })}
      </div>
      {caption && <figcaption className="border-t border-rule px-4 py-2 text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}
