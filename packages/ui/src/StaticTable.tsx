import type { ReactNode } from "react";

export interface Col<T> {
  label: string;
  render: (row: T) => ReactNode;
  /** 'r' right-aligns with tabular figures; use it for every numeric column. */
  align?: "l" | "r";
  key?: string;
}

/**
 * Server-rendered data table for fixed datasets. Columns carry a render function each, so any cell can hold a link,
 * a formatted number or a composed value. Wrap in a scrolling container yourself if the table can get wide.
 */
export function StaticTable<T>({ rows, cols, rowKey, empty = "No data." }: { rows: T[]; cols: Col<T>[]; rowKey: (r: T, i: number) => string; empty?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="data">
        <thead>
          <tr>
            {cols.map((c, i) => (
              <th key={c.key ?? i} className={c.align === "r" ? "r" : ""}>
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
                <td key={c.key ?? j} className={c.align === "r" ? "r" : ""}>
                  {c.render(r)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
