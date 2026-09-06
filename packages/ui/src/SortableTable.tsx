"use client";

import { useMemo, useState } from "react";
import { date, dec1, dec2, eur, int, pct } from "./format";
import { DefaultLink, type LinkLike } from "./link";

/** Serializable column spec, so a server page can hand a client table its layout. */
export interface ColumnSpec {
  key: string;
  label: string;
  kind?: "text" | "int" | "dec1" | "dec2" | "pct" | "pctSigned" | "eur" | "date" | "bool" | "list" | "link";
  /** for kind 'link': which field holds the id passed to `hrefFor` (default 'player_key') */
  keyField?: string;
  width?: string;
}

export type Row = Record<string, string | number | boolean | string[] | null>;

function numeric(kind: ColumnSpec["kind"]): boolean {
  return kind === "int" || kind === "dec1" || kind === "dec2" || kind === "pct" || kind === "pctSigned" || kind === "eur";
}

/**
 * Client-side sortable table. Click a header to sort; numeric kinds sort descending first. `kind: "link"` renders the
 * cell as a link built by `hrefFor(row[keyField])`, using `LinkComponent` (a plain anchor by default).
 */
export function SortableTable({
  columns,
  rows,
  initialSort,
  initialDir = "desc",
  sticky = true,
  emptyText = "Nothing matches these filters.",
  hrefFor,
  LinkComponent = DefaultLink,
}: {
  columns: ColumnSpec[];
  rows: Row[];
  initialSort?: string;
  initialDir?: "asc" | "desc";
  sticky?: boolean;
  emptyText?: string;
  hrefFor?: (key: string) => string;
  LinkComponent?: LinkLike;
}) {
  const [sort, setSort] = useState<string | undefined>(initialSort);
  const [dir, setDir] = useState<"asc" | "desc">(initialDir);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const spec = columns.find((c) => c.key === sort);
    const num = spec ? numeric(spec.kind) : false;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sort];
      const bv = b[sort];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const c = num || (typeof av === "number" && typeof bv === "number") ? Number(av) - Number(bv) : String(av).localeCompare(String(bv), "es");
      return dir === "asc" ? c : -c;
    });
    return copy;
  }, [rows, sort, dir, columns]);

  function toggle(key: string, kind: ColumnSpec["kind"]) {
    if (sort === key) setDir(dir === "asc" ? "desc" : "asc");
    else {
      setSort(key);
      setDir(numeric(kind) ? "desc" : "asc");
    }
  }

  function cell(spec: ColumnSpec, row: Row) {
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

  return (
    <div className={`overflow-x-auto ${sticky ? "sticky-head" : ""}`}>
      <table className="data">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={numeric(c.kind) ? "r" : ""} style={c.width ? { width: c.width } : undefined}>
                <button type="button" onClick={() => toggle(c.key, c.kind)} aria-sort={sort === c.key ? (dir === "asc" ? "ascending" : "descending") : undefined}>
                  {c.label}
                  {sort === c.key ? (dir === "asc" ? " ↑" : " ↓") : ""}
                </button>
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
          {sorted.map((r, i) => (
            <tr key={(r.player_key as string) ?? (r.event_key as string) ?? i}>
              {columns.map((c) => (
                <td key={c.key} className={numeric(c.kind) ? "r" : c.kind === "link" ? "whitespace-nowrap" : ""}>
                  {cell(c, r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
