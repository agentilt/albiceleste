"use client";

import { useMemo, useState } from "react";
import type { AbroadRow } from "@albiceleste/data";
import { type ColumnSpec, type Row, SortableTable } from "@/components/SortableTable";

const POSITIONS = ["Goalkeeper", "Defender", "Midfielder", "Forward"];

const COLUMNS: ColumnSpec[] = [
  { key: "full_name", label: "Player", kind: "player" },
  { key: "age", label: "Age", kind: "int" },
  { key: "primary_position", label: "Position" },
  { key: "team", label: "Club" },
  { key: "competition", label: "Competition" },
  { key: "appearances", label: "Apps", kind: "int" },
  { key: "starts", label: "Starts", kind: "int" },
  { key: "minutes", label: "Minutes", kind: "int" },
  { key: "goals", label: "G", kind: "int" },
  { key: "assists", label: "A", kind: "int" },
  { key: "xg", label: "xG", kind: "dec2" },
  { key: "xa", label: "xA", kind: "dec2" },
  { key: "avg_rating", label: "Rating", kind: "dec2" },
  { key: "eligibility_status", label: "Eligibility" },
  { key: "has_arg_senior_cap", label: "Senior cap", kind: "bool" },
  { key: "is_injured", label: "Injured", kind: "bool" },
];

export function AbroadExplorer({ rows }: { rows: AbroadRow[] }) {
  const competitions = useMemo(() => Array.from(new Set(rows.map((r) => r.competition).filter((c): c is string => !!c))).sort(), [rows]);
  const [comps, setComps] = useState<string[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [maxAge, setMaxAge] = useState(40);
  const [minMinutes, setMinMinutes] = useState(0);
  const [review, setReview] = useState(true);

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (comps.length === 0 || (r.competition !== null && comps.includes(r.competition))) &&
          (positions.length === 0 || (r.primary_position !== null && positions.includes(r.primary_position))) &&
          (r.age ?? 0) <= maxAge &&
          (r.minutes ?? 0) >= minMinutes &&
          (review || r.eligibility_status === "eligible"),
      ),
    [rows, comps, positions, maxAge, minMinutes, review],
  );

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  return (
    <>
      <div className="mb-6 flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-xs uppercase tracking-wide text-muted">Competition</span>
          {competitions.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={comps.includes(c)} onClick={() => toggle(comps, setComps, c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-xs uppercase tracking-wide text-muted">Position</span>
          {POSITIONS.map((p) => (
            <button key={p} type="button" className="chip" aria-pressed={positions.includes(p)} onClick={() => toggle(positions, setPositions, p)}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted">Max age</span>
            <input type="number" min={16} max={45} value={maxAge} onChange={(e) => setMaxAge(Number(e.target.value))} className="w-16" />
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted">Min minutes</span>
            <input type="number" min={0} step={90} value={minMinutes} onChange={(e) => setMinMinutes(Number(e.target.value))} className="w-20" />
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} />
            <span>include players under review</span>
          </label>
          <span className="text-muted">{shown.length} players</span>
        </div>
      </div>
      <SortableTable columns={COLUMNS} rows={shown as unknown as Row[]} initialSort="minutes" />
    </>
  );
}
