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
  /** the two figures, each under its own header (games played, goals plus assists or clean sheets) */
  stats?: [ReactNode, ReactNode];
  /** a short state word shown across both figure columns (out, retired) */
  note?: ReactNode;
}

export interface SheetColumn {
  title: string;
  /** slots in the list for this position (3/9/8/6 for a 26) */
  slots: number;
  names: SheetName[];
  /** the two figure headers, e.g. ["GP", "G+A"] */
  figures?: [string, string];
  /** kept for older callers: one string with both headers */
  hint?: string;
}

const COLS = "grid-cols-[1.1rem_minmax(0,1fr)_1.75rem_2rem]";

function Row({ n, LinkComponent }: { n: SheetName; LinkComponent: LinkLike }) {
  return (
    <li className={`sheet-row grid h-9 ${COLS} items-center gap-x-1.5 border-b border-rule text-[15px]`}>
      <span className="num font-mono text-[11px] text-muted">{n.rank ?? ""}</span>
      <span className="condensed flex min-w-0 items-baseline gap-1.5 leading-tight">
        {n.href ? (
          <LinkComponent href={n.href} className="shrink-0 font-medium text-ink hover:text-celeste-deep">
            {n.name}
          </LinkComponent>
        ) : (
          <span className="shrink-0 font-medium">{n.name}</span>
        )}
        {n.club && <span className="min-w-0 truncate text-xs text-muted">{n.club}</span>}
        {n.marked && (
          <span className="shrink-0 text-[10px] text-gold" aria-hidden="true">
            ●
          </span>
        )}
      </span>
      {n.note ? (
        <span className="col-span-2 truncate text-right font-mono text-[11px] uppercase tracking-wide text-ink-2">{n.note}</span>
      ) : (
        <>
          <span className="num text-right font-mono text-xs text-ink-2">{n.stats?.[0] ?? ""}</span>
          <span className="num text-right font-mono text-xs text-ink-2">{n.stats?.[1] ?? ""}</span>
        </>
      )}
    </li>
  );
}

function figuresOf(col: SheetColumn): [string, string] {
  if (col.figures) return col.figures;
  const parts = (col.hint ?? "").split("·").map((s) => s.trim());
  return [parts[0] ?? "", parts[1] ?? ""];
}

/**
 * The squad sheet: one column per position, as the coach writes it. Each column is a small table (rank, name and club,
 * two figures under their headers); a column ends where its players end. With `secondary` (the challengers), the three
 * names fighting for that position follow under the column in a tinted block with its own label, so the two tiers read
 * apart at a glance and every figure still sits under its header.
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
  /** header strip above the columns */
  title?: string;
  aside?: ReactNode;
  /** explanation on hover of a "?" after the title */
  hint?: string;
  hintHref?: string;
  /** a second tier per position: title, its own columns (paired with `columns` by order), an optional note */
  secondary?: { title: string; aside?: ReactNode; hint?: string; columns: SheetColumn[] };
  /** kept for callers; the sheet is dense by design */
  dense?: boolean;
  LinkComponent?: LinkLike;
}) {
  return (
    <figure className="m-0 min-w-0 border-2 border-ink bg-surface">
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2">
          <h2 className="flex min-w-0 items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-ink">
            <span className="stripe" aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
            <span className="min-w-0 truncate">{title}</span>
            {hint && <Hint text={hint} href={hintHref} />}
          </h2>
          <div className="flex min-w-0 shrink-0 items-center gap-4 font-mono text-xs uppercase tracking-wide text-muted">
            {secondary && (
              <span className="hidden items-center gap-1.5 sm:flex">
                <span className="inline-block h-2.5 w-2.5 border border-rule-strong bg-celeste-tint" aria-hidden="true" />
                {secondary.title}
                {secondary.hint && <Hint text={secondary.hint} href={hintHref} />}
              </span>
            )}
            {aside && <span className="hidden min-w-0 truncate normal-case tracking-normal sm:block">{aside}</span>}
          </div>
        </div>
      )}
      <div className="grid grid-cols-1 gap-x-6 gap-y-5 p-4 sm:grid-cols-2 lg:grid-cols-4">
        {columns.map((col, ci) => {
          const [f0, f1] = figuresOf(col);
          const sec = secondary?.columns[ci];
          return (
            <div key={col.title} className="min-w-0">
              <div className={`grid ${COLS} items-baseline gap-x-1.5 border-b-2 border-celeste pb-1 font-mono text-xs uppercase tracking-wide text-muted`}>
                <span />
                <span className="truncate">
                  {col.title} <span className="num">{col.slots}</span>
                </span>
                <span className="text-right">{f0}</span>
                <span className="text-right">{f1}</span>
              </div>
              <ol>
                {col.names.slice(0, col.slots).map((n) => (
                  <Row key={n.key} n={n} LinkComponent={LinkComponent} />
                ))}
              </ol>
              {sec && sec.names.length > 0 && (
                <div className="-mx-2 mt-2 bg-celeste-tint px-2 pb-1">
                  <div className="border-b border-rule-strong pb-0.5 pt-1.5 font-mono text-[10px] uppercase tracking-wide text-muted">{secondary!.title}</div>
                  <ol>
                    {sec.names.slice(0, sec.slots).map((n) => (
                      <Row key={n.key} n={n} LinkComponent={LinkComponent} />
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {caption && <figcaption className="border-t border-rule px-4 py-2 text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}
