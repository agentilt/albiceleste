"use client";

import { useMemo, useState } from "react";
import type { Competition, FeedItem } from "@albiceleste/data";
import { EventList } from "@/components/EventList";
import { EVENT_LABELS } from "@/components/ui";

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
      <div className="mb-6 flex flex-col gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-xs uppercase tracking-wide text-muted">Competition</span>
          {competitions.map((c) => (
            <button key={c.league} type="button" className="chip" aria-pressed={leagues.includes(c.league)} onClick={() => toggle(leagues, setLeagues, c.league)}>
              {c.competition_name}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-24 text-xs uppercase tracking-wide text-muted">Event</span>
          {typeOptions.map((t) => (
            <button key={t} type="button" className="chip" aria-pressed={types.includes(t)} onClick={() => toggle(types, setTypes, t)}>
              {EVENT_LABELS[t] ?? t}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted">Min severity</span>
            <select value={minSev} onChange={(e) => setMinSev(Number(e.target.value))}>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wide text-muted">Days back</span>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
              {[7, 14, 30, 60].map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <span className="text-muted">{shown.length} events</span>
        </div>
      </div>
      <EventList events={shown} />
    </>
  );
}
