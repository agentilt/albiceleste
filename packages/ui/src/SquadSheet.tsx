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

/**
 * The position columns. One column on a phone, two on a tablet, four from `lg`. Every column is ruled to the same depth
 * (blank lines under a short position) so the sheet reads as one filled box; the fillers vanish on a phone where the
 * columns stack.
 */
function Columns({ columns, dense, small, offset, LinkComponent }: { columns: SheetColumn[]; dense: boolean; small: boolean; offset: number; LinkComponent: LinkLike }) {
  let i = offset;
  const row = dense ? "h-9 text-[15px]" : "py-1 text-sm";
  const depth = Math.max(0, ...columns.map((c) => c.slots));
  const marks = columns.some((c) => c.names.some((n) => n.marked));
  const cols = marks ? "grid-cols-[1.25rem_minmax(0,1fr)_auto_auto]" : "grid-cols-[1.25rem_minmax(0,1fr)_auto]";
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 ${dense ? "gap-x-4 gap-y-3 p-3" : "gap-x-6 gap-y-4 p-4 sm:gap-x-8"}`}>
      {columns.map((col) => (
        <div key={col.title} className="min-w-0">
          {!small && (
            <div className="mb-1 flex items-baseline justify-between gap-2 border-b-2 border-celeste pb-1 font-mono text-xs uppercase tracking-wide text-muted">
              <span className="whitespace-nowrap">
                {col.title} <span className="num">{col.slots}</span>
              </span>
              {col.hint && <span className="whitespace-nowrap normal-case tracking-normal">{col.hint}</span>}
            </div>
          )}
          <ol>
            {Array.from({ length: depth }, (_, k) => {
              const filler = k >= col.slots;
              const n = filler ? undefined : col.names[k];
              const delay = `${Math.min(i++, 40) * 20}ms`;
              return (
                <li
                  key={n ? n.key : `empty-${k}`}
                  className={`sheet-row ${filler ? "hidden sm:grid" : "grid"} ${cols} items-center gap-x-2 border-b border-rule ${row}`}
                  style={{ animationDelay: delay }}
                  aria-hidden={filler || undefined}
                >
                  <span className="num font-mono text-[11px] text-muted">{n?.rank ?? ""}</span>
                  {n ? (
                    <span className={`condensed min-w-0 leading-tight ${dense ? "flex items-baseline gap-1.5" : ""}`}>
                      {n.href ? (
                        <LinkComponent href={n.href} className="min-w-0 truncate font-medium text-ink hover:text-celeste-deep">
                          {n.name}
                        </LinkComponent>
                      ) : (
                        <span className="min-w-0 truncate font-medium">{n.name}</span>
                      )}
                      {n.club && (dense ? <span className="min-w-0 shrink-[3] truncate text-xs text-muted">{n.club}</span> : <span className="block truncate text-[11px] text-muted">{n.club}</span>)}
                    </span>
                  ) : (
                    <span className="text-rule-strong">{filler ? "" : "—"}</span>
                  )}
                  <span className="num whitespace-nowrap font-mono text-xs text-ink-2">{n?.note ?? n?.stats ?? ""}</span>
                  {marks && (
                    <span className="text-[10px] text-gold" title={n?.marked ? "last squad" : undefined} aria-hidden={!n?.marked}>
                      {n?.marked ? "●" : ""}
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      ))}
    </div>
  );
}

/**
 * The squad sheet: the list as the coach would write it, one column per position, the slot count fixed by the list size.
 * A `secondary` block (the challengers) sits under a firm rule in a smaller register; one caption covers both.
 */
export function SquadSheet({
  columns,
  caption,
  title,
  aside,
  hint,
  hintHref,
  secondary,
  dense = false,
  LinkComponent = DefaultLink,
}: {
  columns: SheetColumn[];
  caption?: ReactNode;
  /** header strip above the columns */
  title?: string;
  aside?: ReactNode;
  /** explanation on hover of a "?" after the title */
  hint?: string;
  hintHref?: string;
  /** a second, smaller block under a rule: title, its own columns, an optional right-hand note */
  secondary?: { title: string; aside?: ReactNode; hint?: string; columns: SheetColumn[] };
  /** one line per name, club on hover: fits a screen */
  dense?: boolean;
  LinkComponent?: LinkLike;
}) {
  const primaryCount = columns.reduce((s, c) => s + c.slots, 0);
  return (
    <figure className="m-0 min-w-0 border-2 border-ink bg-surface">
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2">
          <h2 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-ink">
            <span className="stripe" aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
            {title}
            {hint && <Hint text={hint} href={hintHref} />}
          </h2>
          {aside && <div className="hidden min-w-0 truncate text-sm text-muted sm:block">{aside}</div>}
        </div>
      )}
      <Columns columns={columns} dense={dense} small={false} offset={0} LinkComponent={LinkComponent} />
      {secondary && (
        <>
          <div className="mx-3 mt-1 flex items-center justify-between gap-3 border-t border-rule-strong px-1 pt-3">
            <h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-muted">
              {secondary.title}
              {secondary.hint && <Hint text={secondary.hint} href={hintHref} />}
            </h3>
            {secondary.aside && <div className="min-w-0 truncate text-xs text-muted">{secondary.aside}</div>}
          </div>
          <Columns columns={secondary.columns} dense={dense} small offset={primaryCount} LinkComponent={LinkComponent} />
        </>
      )}
      {caption && <figcaption className="border-t border-rule px-4 py-2 text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}
