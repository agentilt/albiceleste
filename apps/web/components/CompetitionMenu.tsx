"use client";

import { Menu, MenuCheck, MenuColumns, MenuGroup, MenuNote, MenuRadio, MenuRule } from "@albiceleste/ui";
import type { Competition } from "@albiceleste/data";
import { PRESETS, useCompetitionFilter } from "@/lib/compfilter";
import { facetValue } from "@/lib/facet";
import { t, type Locale } from "@/lib/i18n";

/**
 * The shared competition facet: "all" and the three presets as one choice, then every league as a check. The chip
 * names the preset when the selection is one, the leagues otherwise.
 */
export function CompetitionMenu({ competitions, locale, filter }: { competitions: Competition[]; locale: Locale; filter: ReturnType<typeof useCompetitionFilter> }) {
  const d = t(locale);
  const same = (a: string[], b: string[]) => a.length === b.length && a.every((x) => b.includes(x));
  const keys = Object.keys(PRESETS) as (keyof typeof PRESETS)[];
  const preset = keys.find((k) => same(filter.selected, PRESETS[k]));
  const value = preset
    ? d.comp.presets[preset]
    : facetValue(
        filter.selected.map((l) => competitions.find((c) => c.league === l)?.competition_name ?? l),
        d.comp.nLeagues,
      );
  return (
    <Menu label={d.comp.label} value={value} active={filter.selected.length > 0} title={filter.remembered ? d.comp.remembered : undefined} wide>
      <MenuGroup radio>
        <MenuRadio checked={filter.selected.length === 0} onSelect={filter.clear}>
          {d.comp.clear}
        </MenuRadio>
        {keys.map((k) => (
          <MenuRadio key={k} checked={preset === k} onSelect={() => filter.setAll(PRESETS[k])}>
            {d.comp.presets[k]}
          </MenuRadio>
        ))}
      </MenuGroup>
      <MenuRule />
      <MenuGroup label={d.comp.leagues}>
        <MenuColumns>
          {competitions.map((c) => (
            <MenuCheck key={c.league} checked={filter.selected.includes(c.league)} onChange={() => filter.toggle(c.league)}>
              {c.competition_name}
            </MenuCheck>
          ))}
        </MenuColumns>
      </MenuGroup>
      {filter.remembered && (
        <>
          <MenuRule />
          <MenuNote>{d.comp.remembered}</MenuNote>
        </>
      )}
    </Menu>
  );
}
