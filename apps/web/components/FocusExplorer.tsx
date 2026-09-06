"use client";

import { Chip, type ColumnSpec, FilterBar, FilterRow, type Row, SortableTable } from "@albiceleste/ui";
import type { FocusRow } from "@albiceleste/data";
import { useMemo, useState } from "react";
import { playerHref } from "@/lib/format";
import { AppLink } from "@/lib/link";

const REASONS: Record<string, string> = {
  abroad: "abroad",
  u23_regular: "U23 regular",
  capped: "senior cap",
  top_minutes_position: "top minutes in position",
  rising_starter: "rising starter",
};
const GROUPS = ["GK", "DEF", "MID", "FWD"];

const COLUMNS: ColumnSpec[] = [
  { key: "full_name", label: "Player", kind: "link" },
  { key: "age", label: "Age", kind: "int" },
  { key: "pos_group", label: "Pos" },
  { key: "team", label: "Club" },
  { key: "competition", label: "Competition" },
  { key: "starts", label: "Starts", kind: "int" },
  { key: "minutes", label: "Minutes", kind: "int" },
  { key: "goals", label: "G", kind: "int" },
  { key: "assists", label: "A", kind: "int" },
  { key: "starts_last5", label: "Starts, last 5", kind: "int" },
  { key: "starts_prev5", label: "Prev 5", kind: "int" },
  { key: "minutes_rank_in_position", label: "Min. rank in pos", kind: "int" },
  { key: "reasons", label: "Why in focus", kind: "list" },
];

export function FocusExplorer({ rows }: { rows: FocusRow[] }) {
  const [reasons, setReasons] = useState<string[]>([]);
  const [groups, setGroups] = useState<string[]>([]);
  const [homeOnly, setHomeOnly] = useState(true);

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (reasons.length === 0 || r.reasons.some((x) => reasons.includes(x))) &&
          (groups.length === 0 || (r.pos_group !== null && groups.includes(r.pos_group))) &&
          (!homeOnly || r.current_league === "arg.1"),
      ),
    [rows, reasons, groups, homeOnly],
  );

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  return (
    <>
      <FilterBar>
        <FilterRow label="Reason">
          {Object.entries(REASONS).map(([k, v]) => (
            <Chip key={k} pressed={reasons.includes(k)} onClick={() => toggle(reasons, setReasons, k)}>
              {v}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Position">
          {GROUPS.map((g) => (
            <Chip key={g} pressed={groups.includes(g)} onClick={() => toggle(groups, setGroups, g)}>
              {g}
            </Chip>
          ))}
          <label className="ml-4 flex items-center gap-2">
            <input type="checkbox" checked={homeOnly} onChange={(e) => setHomeOnly(e.target.checked)} />
            <span>Argentine league only</span>
          </label>
          <span className="ml-2 text-muted">{shown.length} players</span>
        </FilterRow>
      </FilterBar>
      <SortableTable
        columns={COLUMNS}
        rows={shown.map((r) => ({ ...r, reasons: r.reasons.map((x) => REASONS[x] ?? x) })) as unknown as Row[]}
        initialSort="minutes"
        hrefFor={playerHref}
        LinkComponent={AppLink}
      />
    </>
  );
}
