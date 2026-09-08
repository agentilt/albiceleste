import type { ReactNode } from "react";
import { DefaultLink, type LinkLike } from "./link";

export interface SheetName {
  key: string;
  name: string;
  href?: string;
  club: string | null;
  rank: number | null;
  /** last-squad mark */
  marked?: boolean;
}

export interface SheetColumn {
  title: string;
  /** slots in the list for this position (3/9/8/6 for a 26) */
  slots: number;
  names: SheetName[];
}

/**
 * The squad sheet: the list as the coach would write it, one column per position, the slot count fixed by the list size.
 * Filled from the ranking on Home ("if the list were announced today"); empty slots stay ruled, so a thin position shows.
 */
export function SquadSheet({ columns, caption, dense = false, LinkComponent = DefaultLink }: { columns: SheetColumn[]; caption?: ReactNode; /** one line per name, club on hover: fits a screen */ dense?: boolean; LinkComponent?: LinkLike }) {
  let i = 0;
  return (
    <figure className="m-0 border-2 border-ink bg-surface">
      <div className={`grid grid-cols-2 sm:grid-cols-4 ${dense ? "gap-x-4 gap-y-3 p-3" : "gap-x-6 gap-y-4 p-4 sm:gap-x-8"}`}>
        {columns.map((col) => (
          <div key={col.title}>
            <div className="mb-1 flex items-baseline justify-between border-b-2 border-celeste pb-1 font-mono text-[11px] uppercase tracking-wide text-muted">
              <span>{col.title}</span>
              <span className="num">{col.slots}</span>
            </div>
            <ol className="text-sm">
              {Array.from({ length: col.slots }, (_, k) => {
                const n = col.names[k];
                const delay = `${Math.min(i++, 30) * 25}ms`;
                return (
                  <li key={n ? n.key : `empty-${k}`} className={`sheet-row grid grid-cols-[1.25rem_1fr_auto] items-start gap-x-1 border-b border-rule ${dense ? "py-0.5" : "py-1"}`} style={{ animationDelay: delay }} title={dense && n?.club ? n.club : undefined}>
                    <span className="num pt-0.5 font-mono text-[11px] text-muted">{n?.rank ?? ""}</span>
                    {n ? (
                      <span className={`condensed min-w-0 leading-tight ${dense ? "truncate" : ""}`}>
                        {n.href ? (
                          <LinkComponent href={n.href} className="font-medium text-ink hover:text-celeste-deep">
                            {n.name}
                          </LinkComponent>
                        ) : (
                          <span className="font-medium">{n.name}</span>
                        )}
                        {n.club && !dense && <span className="block truncate text-[11px] text-muted">{n.club}</span>}
                      </span>
                    ) : (
                      <span className="text-rule-strong">—</span>
                    )}
                    <span className="pt-0.5 text-[10px] text-gold" title={n?.marked ? "last squad" : undefined} aria-hidden={!n?.marked}>
                      {n?.marked ? "●" : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </div>
      {caption && <figcaption className="border-t border-rule px-4 py-2 text-xs text-muted">{caption}</figcaption>}
    </figure>
  );
}
