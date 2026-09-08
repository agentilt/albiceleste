"use client";

import { Chip, FilterRow } from "@albiceleste/ui";
import type { Competition } from "@albiceleste/data";
import { useState } from "react";
import { PRESETS, useCompetitionFilter } from "@/lib/compfilter";
import { t, type Locale } from "@/lib/i18n";

/**
 * The shared competition control: "all", the presets, the leagues currently chosen, and a toggle that unfolds the
 * fourteen league chips. One row in the common case.
 */
export function CompetitionChips({ competitions, locale, filter }: { competitions: Competition[]; locale: Locale; filter: ReturnType<typeof useCompetitionFilter> }) {
  const d = t(locale);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const preset = (Object.keys(PRESETS) as (keyof typeof PRESETS)[]).find((k) => same(filter.selected, PRESETS[k]));
  const [open, setOpen] = useState(false);
  const shown = open ? competitions : preset ? [] : competitions.filter((c) => filter.selected.includes(c.league));
  return (
    <FilterRow label={d.comp.label}>
      <Chip pressed={filter.selected.length === 0} onClick={filter.clear}>
        {d.comp.clear}
      </Chip>
      {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
        <Chip key={k} pressed={preset === k} onClick={() => filter.setAll(PRESETS[k])}>
          {d.comp.presets[k]}
        </Chip>
      ))}
      <button type="button" className="chip" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? d.comp.fewer : d.comp.more}
      </button>
      {shown.map((c) => (
        <Chip key={c.league} pressed={filter.selected.includes(c.league)} onClick={() => filter.toggle(c.league)}>
          {c.competition_name}
        </Chip>
      ))}
      {filter.remembered && <span className="text-xs text-muted">{d.comp.remembered}</span>}
    </FilterRow>
  );
}
