"use client";

import { Chip, FilterRow } from "@albiceleste/ui";
import type { Competition } from "@albiceleste/data";
import { PRESETS, useCompetitionFilter } from "@/lib/compfilter";
import { t, type Locale } from "@/lib/i18n";

/** The shared competition control: presets, the fourteen chips, a clear chip, and the "remembered" hint. */
export function CompetitionChips({ competitions, locale, filter }: { competitions: Competition[]; locale: Locale; filter: ReturnType<typeof useCompetitionFilter> }) {
  const d = t(locale);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  return (
    <FilterRow label={d.comp.label}>
      <Chip pressed={filter.selected.length === 0} onClick={filter.clear}>
        {d.comp.clear}
      </Chip>
      {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => (
        <Chip key={k} pressed={same(filter.selected, PRESETS[k])} onClick={() => filter.setAll(PRESETS[k])}>
          {d.comp.presets[k]}
        </Chip>
      ))}
      <span className="mx-1 text-muted">·</span>
      {competitions.map((c) => (
        <Chip key={c.league} pressed={filter.selected.includes(c.league)} onClick={() => filter.toggle(c.league)}>
          {c.competition_name}
        </Chip>
      ))}
      {filter.remembered && <span className="text-xs text-muted">{d.comp.remembered}</span>}
    </FilterRow>
  );
}
