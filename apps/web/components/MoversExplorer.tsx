"use client";

import { Chip, FilterBar, FilterRow, Note, Segmented } from "@albiceleste/ui";
import type { Competition, MoverRow } from "@albiceleste/data";
import { useMemo } from "react";
import { MoverLine } from "@/components/MoverLine";
import type { EventContext } from "@/lib/events";
import { fmtDate } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { useFollows } from "@/lib/store";
import { boolParam, listParam, useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;
const KINDS = ["rank_move", "club_change", "debut_in_league", "first_start_of_season", "consecutive_starts", "scoring_streak", "multi_goal_match", "return_after_absence", "minutes_surge", "minutes_drop", "selection_called", "selection_left_out"];
type Period = "7" | "14" | "28" | "window";

function addDays(ymd: string, n: number): string {
  const [y, m, dd] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, dd! + n)).toISOString().slice(0, 10);
}

export function MoversExplorer({ rows, competitions, locale, ctx, horizon, lastAnnouncement, lastWindowLabel }: { rows: MoverRow[]; competitions: Competition[]; locale: Locale; ctx: EventContext; horizon: string; lastAnnouncement: string | null; lastWindowLabel: string | null }) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const { follows } = useFollows();
  const pos = listParam(get("pos"));
  const comp = listParam(get("comp"));
  const kinds = listParam(get("kind"));
  const dirs = listParam(get("dir"));
  const squad = boolParam(get("squad"));
  const fol = boolParam(get("fol"));
  const periodRaw = get("period");
  const period: Period = periodRaw === "7" || periodRaw === "14" || periodRaw === "window" ? periodRaw : "28";
  const order = get("order") === "date" ? "date" : "importance";
  const since = period === "window" && lastAnnouncement ? lastAnnouncement : addDays(horizon, -Number(period === "window" ? 28 : period));

  const shown = useMemo(() => {
    const f = rows.filter(
      (r) =>
        r.event_date >= since &&
        (pos.length === 0 || (r.pos_group !== null && pos.includes(r.pos_group))) &&
        (comp.length === 0 || (r.league !== null && comp.includes(r.league))) &&
        (kinds.length === 0 || kinds.includes(r.event_type)) &&
        (dirs.length === 0 || dirs.includes(r.direction)) &&
        (!squad || r.in_last_squad) &&
        (!fol || follows.includes(r.player_key)),
    );
    return order === "date" ? [...f].sort((a, b) => b.event_date.localeCompare(a.event_date) || b.importance - a.importance) : f;
  }, [rows, since, pos, comp, kinds, dirs, squad, fol, follows, order]);

  const batch = shown.filter((r) => r.event_type === "selection_called" || r.event_type === "selection_left_out");
  const rest = shown.filter((r) => !(r.event_type === "selection_called" || r.event_type === "selection_left_out"));
  const toggle = (key: string, list: string[], v: string) => set({ [key]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",") });

  return (
    <>
      <FilterBar>
        <FilterRow label={d.common.period}>
          <Segmented<Period>
            options={[
              { value: "7", label: d.movers.periods["7"] },
              { value: "14", label: d.movers.periods["14"] },
              { value: "28", label: d.movers.periods["28"] },
              ...(lastAnnouncement ? [{ value: "window" as Period, label: d.movers.periods.window }] : []),
            ]}
            value={period}
            onChange={(v) => set({ period: v === "28" ? null : v })}
          />
          <span className="ml-4 text-xs uppercase tracking-wide text-muted">{d.common.sortBy}</span>
          <Segmented
            options={[
              { value: "importance", label: d.movers.byImportance },
              { value: "date", label: d.movers.byDate },
            ]}
            value={order}
            onChange={(v) => set({ order: v === "date" ? "date" : null })}
          />
        </FilterRow>
        <FilterRow label={d.common.kind}>
          {KINDS.map((k) => (
            <Chip key={k} pressed={kinds.includes(k)} onClick={() => toggle("kind", kinds, k)}>
              {(d.movers.kinds as Record<string, string>)[k]}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={d.common.position}>
          {GROUPS.map((g) => (
            <Chip key={g} pressed={pos.includes(g)} onClick={() => toggle("pos", pos, g)}>
              {d.pos[g]}
            </Chip>
          ))}
          <span className="ml-4 text-xs uppercase tracking-wide text-muted">{d.common.direction}</span>
          {(["up", "down", "neutral"] as const).map((x) => (
            <Chip key={x} pressed={dirs.includes(x)} onClick={() => toggle("dir", dirs, x)}>
              {d.common[x]}
            </Chip>
          ))}
          <Chip pressed={squad} onClick={() => set({ squad: squad ? null : "1" })}>
            {d.pool.lastSquad}
          </Chip>
          <Chip pressed={fol} onClick={() => set({ fol: fol ? null : "1" })}>
            {d.common.followedOnly}
          </Chip>
        </FilterRow>
        <FilterRow label={d.common.competition}>
          {competitions.map((c) => (
            <Chip key={c.league} pressed={comp.includes(c.league)} onClick={() => toggle("comp", comp, c.league)}>
              {c.competition_name}
            </Chip>
          ))}
        </FilterRow>
      </FilterBar>

      <p className="mb-3 text-sm text-muted">
        {d.movers.count(shown.length)} · {fmtDate(locale, since)} → {fmtDate(locale, horizon)}
      </p>

      {batch.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-1 border-b border-rule-strong pb-1 text-xl">{d.movers.squadBatch(lastWindowLabel ?? "")}</h2>
          <ol>
            {batch.map((m) => (
              <MoverLine key={m.event_key} m={m} locale={locale} ctx={ctx} />
            ))}
          </ol>
        </section>
      )}

      {rest.length === 0 && batch.length === 0 ? (
        <p className="text-sm text-muted">{d.movers.quiet}</p>
      ) : (
        <ol>
          {rest.map((m, i) => (
            <MoverLine key={m.event_key} m={m} locale={locale} ctx={ctx} showDate={order !== "date" || i === 0 || rest[i - 1]!.event_date !== m.event_date} />
          ))}
        </ol>
      )}
      <Note>{d.movers.lede}</Note>
    </>
  );
}
