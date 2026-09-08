import type { CSSProperties, ReactNode } from "react";
import { priorityClass } from "./priority";

export interface Col<T> {
  label: string;
  render: (row: T) => ReactNode;
  /** 'r' right-aligns with tabular figures; use it for every numeric column. */
  align?: "l" | "r";
  key?: string;
  /** 1 (default): always shown; 2: hidden on a phone (under `sm`); 3: hidden under `lg` */
  priority?: 1 | 2 | 3;
  /** truncate the cell at this CSS width instead of widening the table */
  maxWidth?: string;
}

/**
 * Server-rendered data table for fixed datasets. Columns carry a render function each, so any cell can hold a link,
 * a formatted number or a composed value. The wrapper scrolls sideways with a shadow on the hidden edge.
 */
export function StaticTable<T>({ rows, cols, rowKey, empty = "No data.", caption }: { rows: T[]; cols: Col<T>[]; rowKey: (r: T, i: number) => string; empty?: string; caption?: string }) {
  return (
    <div className="scroll-x">
      <table className="data">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={c.key ?? i} className={`${c.align === "r" ? "r" : ""} ${priorityClass(c.priority)}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={cols.length} className="text-muted">
                {empty}
              </td>
            </tr>
          )}
          {rows.map((r, i) => (
            <tr key={rowKey(r, i)}>
              {cols.map((c, j) => (
                <td key={c.key ?? j} className={`${c.align === "r" ? "r" : ""} ${priorityClass(c.priority)}`}>
                  {c.maxWidth ? (
                    <span className="clip" style={{ "--cw": c.maxWidth } as CSSProperties}>
                      {c.render(r)}
                    </span>
                  ) : (
                    c.render(r)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
