import { getCompetitions, getWindows } from "@albiceleste/data";
import type { EventContext } from "./events";

let cache: Promise<EventContext> | null = null;

/** Competition names and window labels the event renderer needs; built once per build. */
export function eventContext(): Promise<EventContext> {
  if (!cache) {
    cache = Promise.all([getCompetitions(), getWindows()]).then(([comps, windows]) => ({
      leagues: Object.fromEntries(comps.map((c) => [c.league, c.competition_name])),
      windows: Object.fromEntries(windows.map((w) => [w.window_id, { label_es: w.label_es, label_en: w.label_en }])),
    }));
  }
  return cache;
}
