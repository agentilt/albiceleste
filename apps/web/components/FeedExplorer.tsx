"use client";

import { Chip, EVENT_LABELS, EventList, Field, FilterBar, FilterRow } from "@albiceleste/ui";
import type { Competition, FeedItem } from "@albiceleste/data";
import { useMemo, useState } from "react";
import { playerHref } from "@/lib/format";
import { AppLink } from "@/lib/link";

export function FeedExplorer({ items, competitions, asOf }: { items: FeedItem[]; competitions: Competition[]; asOf: string }) {
  const [leagues, setLeagues] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [minSev, setMinSev] = useState(2);
  const [days, setDays] = useState(30);

  const typeOptions = useMemo(() => Array.from(new Set(items.map((i) => i.event_type))).sort(), [items]);
  const cutoff = useMemo(() => {
    const d = new Date(asOf);
    d.setDate(d.getDate() - days);
    return d.toISOString().slice(0, 10);
  }, [asOf, days]);

  const shown = useMemo(
    () =>
      items.filter(
        (i) =>
          i.event_date >= cutoff &&
          i.severity >= minSev &&
          (leagues.length === 0 || (i.current_league !== null && leagues.includes(i.current_league))) &&
          (types.length === 0 || types.includes(i.event_type)),
      ),
    [items, cutoff, minSev, leagues, types],
  );

  function toggle(list: string[], set: (v: string[]) => void, v: string) {
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
  }

  return (
    <>
      <FilterBar>
        <FilterRow label="Competition">
          {competitions.map((c) => (
            <Chip key={c.league} pressed={leagues.includes(c.league)} onClick={() => toggle(leagues, setLeagues, c.league)}>
              {c.competition_name}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label="Event">
          {typeOptions.map((t) => (
            <Chip key={t} pressed={types.includes(t)} onClick={() => toggle(types, setTypes, t)}>
              {EVENT_LABELS[t] ?? t}
            </Chip>
          ))}
        </FilterRow>
        <div className="flex flex-wrap items-center gap-4">
          <Field label="Min severity">
            <select value={minSev} onChange={(e) => setMinSev(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </Field>
          <Field label="Days back">
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 14, 30, 60].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </Field>
          <span className="text-muted">{shown.length} events</span>
        </div>
      </FilterBar>
      <EventList events={shown} hrefFor={playerHref} LinkComponent={AppLink} />
    </>
  );
}
