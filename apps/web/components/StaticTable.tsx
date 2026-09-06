import type { ReactNode } from "react";

/** Server-rendered table for small, fixed datasets. Formatters are plain functions, so use only from server components. */
export interface Col<T> {
  label: string;
  render: (row: T) => ReactNode;
  align?: "l" | "r";
  key?: string;
}

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
