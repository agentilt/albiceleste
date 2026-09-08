"use client";

import { type CSSProperties, Fragment, type ReactNode, useMemo, useState } from "react";
import { date, dec1, dec2, eur, int, pct } from "./format";
import { DefaultLink, type LinkLike } from "./link";
import { priorityClass } from "./priority";

/** Serializable column spec, so a server page can hand a client table its layout. */
export interface ColumnSpec {
  key: string;
  label: string;
  kind?: "text" | "int" | "dec1" | "dec2" | "pct" | "pctSigned" | "eur" | "date" | "bool" | "list" | "link";
  /** for kind 'link': which field holds the id passed to `hrefFor` (default 'player_key') */
  keyField?: string;
  width?: string;
  /** custom cell (client tables only); sorting still uses `row[key]` unless `sortValue` is given */
  render?: (row: Row) => ReactNode;
  sortValue?: (row: Row) => string | number | boolean | null;
  /** right-align without a numeric kind */
  align?: "l" | "r";
  /** a longer explanation shown on hover of the header */
  title?: string;
  /** header text when the label is an abbreviation that needs no sort affordance change */
  sortable?: boolean;
  /** 1 (default): always shown; 2: hidden on a phone (under `sm`); 3: hidden under `lg`. The phone keeps what matters. */
  priority?: 1 | 2 | 3;
  /** truncate the cell at this CSS width (club and competition names) instead of widening the table */
  maxWidth?: string;
}

export type Row = Record<string, string | number | boolean | string[] | null>;

function numeric(kind: ColumnSpec["kind"]): boolean {
  return kind === "int" || kind === "dec1" || kind === "dec2" || kind === "pct" || kind === "pctSigned" || kind === "eur";
}

/**
 * Client-side sortable table. Click a header to sort; numeric kinds sort descending first. `kind: "link"` renders the
 * cell as a link built by `hrefFor(row[keyField])`, using `LinkComponent` (a plain anchor by default). The wrapper
 * scrolls sideways with a shadow on the hidden edge; give secondary columns a `priority` so a phone drops them instead.
 */
export function SortableTable({
  columns,
  rows,
  initialSort,
  initialDir = "desc",
  sort: sortProp,
  dir: dirProp,
  onSortChange,
  sticky = true,
  emptyText = "Nothing matches these filters.",
  hrefFor,
  LinkComponent = DefaultLink,
  rowKey,
  rowClassName,
  caption,
  groupBy,
}: {
  columns: ColumnSpec[];
  rows: Row[];
  initialSort?: string;
  initialDir?: "asc" | "desc";
  /** controlled sorting (the host keeps it in the URL); omit for internal state */
  sort?: string;
  dir?: "asc" | "desc";
  onSortChange?: (sort: string | undefined, dir: "asc" | "desc") => void;
  sticky?: boolean;
  emptyText?: string;
  hrefFor?: (key: string) => string;
  LinkComponent?: LinkLike;
  rowKey?: (row: Row, i: number) => string;
  rowClassName?: (row: Row) => string | undefined;
  /** accessible table name (visually hidden) */
  caption?: string;
  /** group rows under mono sub-headers (position groups); sorting applies within each group, one header for all */
  groupBy?: { of: (row: Row) => string; order?: string[]; label: (key: string, count: number) => ReactNode };
}) {
  const [sortState, setSortState] = useState<string | undefined>(initialSort);
  const [dirState, setDirState] = useState<"asc" | "desc">(initialDir);
  const controlled = sortProp !== undefined || onSortChange !== undefined;
  const sort = controlled ? sortProp : sortState;
  const dir = controlled ? (dirProp ?? "desc") : dirState;

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const spec = columns.find((c) => c.key === sort);
    const num = spec ? numeric(spec.kind) : false;
    const val = (r: Row) => (spec?.sortValue ? spec.sortValue(r) : r[sort]);
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = val(a);
      const bv = val(b);
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const c = num || (typeof av === "number" && typeof bv === "number") ? Number(av) - Number(bv) : String(av).localeCompare(String(bv), "es");
      return dir === "asc" ? c : -c;
    });
    return copy;
  }, [rows, sort, dir, columns]);

  const bodies = useMemo(() => {
    if (!groupBy) return [{ key: "", rows: sorted }];
    const map = new Map<string, Row[]>();
    for (const r of sorted) {
      const k = groupBy.of(r);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    const order = groupBy.order ?? [];
    const keys = [...order.filter((k) => map.has(k)), ...[...map.keys()].filter((k) => !order.includes(k))];
    return keys.map((k) => ({ key: k, rows: map.get(k)! }));
  }, [sorted, groupBy]);

  function toggle(key: string, kind: ColumnSpec["kind"]) {
    const next: [string | undefined, "asc" | "desc"] = sort === key ? [key, dir === "asc" ? "desc" : "asc"] : [key, numeric(kind) ? "desc" : "asc"];
    if (controlled) onSortChange?.(next[0], next[1]);
    else {
      setSortState(next[0]);
      setDirState(next[1]);
    }
  }

  function cell(spec: ColumnSpec, row: Row) {
    if (spec.render) return spec.render(row);
    const v = row[spec.key];
    switch (spec.kind) {
      case "int":
        return int(v as number | null);
      case "dec1":
        return dec1(v as number | null);
      case "dec2":
        return dec2(v as number | null);
      case "pct":
        return pct(v as number | null);
      case "pctSigned":
        return pct(v as number | null, true);
      case "eur":
        return eur(v as number | null);
      case "date":
        return date(v as string | null);
      case "bool":
        return v ? "yes" : "";
      case "list":
        return Array.isArray(v) ? v.join(", ") : (v ?? "");
      case "link": {
        const key = row[spec.keyField ?? "player_key"];
        return typeof key === "string" && hrefFor ? (
          <LinkComponent className="link" href={hrefFor(key)}>
            {String(v ?? "")}
          </LinkComponent>
        ) : (
          String(v ?? "")
        );
      }
      default:
        return v === null || v === undefined ? "" : String(v);
    }
  }

  function clipped(spec: ColumnSpec, content: ReactNode) {
    if (!spec.maxWidth) return content;
    return (
      <span className="clip" style={{ "--cw": spec.maxWidth } as CSSProperties} title={typeof content === "string" ? content : undefined}>
        {content}
      </span>
    );
  }

  return (
    <div className={`scroll-x ${sticky ? "sticky-head" : ""}`}>
      <table className="data">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                className={`${numeric(c.kind) || c.align === "r" ? "r" : ""} ${priorityClass(c.priority)}`}
                style={c.width ? { width: c.width } : undefined}
                title={c.title}
                aria-sort={sort === c.key ? (dir === "asc" ? "ascending" : "descending") : undefined}
              >
                {c.sortable === false ? (
                  c.label
                ) : (
                  <button type="button" onClick={() => toggle(c.key, c.kind)}>
                    {c.label}
                    {sort === c.key ? (dir === "asc" ? " ↑" : " ↓") : ""}
                  </button>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 && (
            <tr>
              <td colSpan={columns.length} className="text-muted">
                {emptyText}
              </td>
            </tr>
          )}
          {bodies.map((b) => (
            <Fragment key={b.key}>
              {groupBy && (
                <tr className="group-row">
                  <td colSpan={columns.length}>{groupBy.label(b.key, b.rows.length)}</td>
                </tr>
              )}
              {b.rows.map((r, i) => (
                <tr key={rowKey ? rowKey(r, i) : ((r.player_key as string) ?? (r.event_key as string) ?? i)} className={rowClassName?.(r)}>
                  {columns.map((c) => (
                    <td key={c.key} className={`${numeric(c.kind) || c.align === "r" ? "r" : c.kind === "link" ? "whitespace-nowrap" : ""} ${priorityClass(c.priority)}`}>
                      {clipped(c, cell(c, r))}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
