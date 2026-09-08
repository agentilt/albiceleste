"use client";

import { Chip, type ColumnSpec, FilterBar, FilterRow, Panel, PanelRows, type Row, Segmented, SortableTable, StateWord } from "@albiceleste/ui";
import type { Competition, MoverRow } from "@albiceleste/data";
import { useMemo, useState } from "react";
import { CompetitionChips } from "@/components/CompetitionChips";
import { FollowStar } from "@/components/FollowStar";
import { MoverMark, MoverWho, moverChange, moverFact } from "@/components/MoverLine";
import { useCompetitionFilter } from "@/lib/compfilter";
import type { EventContext } from "@/lib/events";
import { fmtDate } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { stateLabel, stateTone } from "@/lib/state";
import { useFollows } from "@/lib/store";
import { boolParam, listParam, useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;
const KINDS = [
  "rank_move",
  "club_change",
  "debut_in_league",
  "first_start_of_season",
  "consecutive_starts",
  "scoring_streak",
  "multi_goal_match",
  "return_after_absence",
  "minutes_surge",
  "minutes_drop",
  "selection_called",
  "selection_left_out",
];
type Period = "7" | "14" | "28" | "window";
const LIMIT = 60;

function addDays(ymd: string, n: number): string {
  const [y, m, dd] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, dd! + n)).toISOString().slice(0, 10);
}

export function MoversExplorer({
  rows,
  competitions,
  locale,
  ctx,
  horizon,
  lastAnnouncement,
  lastWindowLabel,
}: {
  rows: MoverRow[];
  competitions: Competition[];
  locale: Locale;
  ctx: EventContext;
  horizon: string;
  lastAnnouncement: string | null;
  lastWindowLabel: string | null;
}) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const { follows } = useFollows();
  const comp = useCompetitionFilter();
  const pos = listParam(get("pos"));
  const kinds = listParam(get("kind"));
  const dirs = listParam(get("dir"));
  const squad = boolParam(get("squad"));
  const fol = boolParam(get("fol"));
  const periodRaw = get("period");
  const period: Period = periodRaw === "7" || periodRaw === "14" || periodRaw === "window" ? periodRaw : "28";
  const order = get("order") === "date" ? "date" : "importance";
  const since = period === "window" && lastAnnouncement ? lastAnnouncement : addDays(horizon, -Number(period === "window" ? 28 : period));
  const [all, setAll] = useState(false);

  const shown = useMemo(() => {
    const f = rows.filter(
      (r) =>
        r.event_date >= since &&
        (pos.length === 0 || (r.pos_group !== null && pos.includes(r.pos_group))) &&
        comp.matches(r.league) &&
        (kinds.length === 0 || kinds.includes(r.event_type)) &&
        (dirs.length === 0 || dirs.includes(r.direction)) &&
        (!squad || r.in_last_squad) &&
        (!fol || follows.includes(r.player_key)),
    );
    return order === "date"
      ? [...f].sort((a, b) => b.event_date.localeCompare(a.event_date) || b.importance - a.importance)
      : [...f].sort((a, b) => b.importance - a.importance || b.event_date.localeCompare(a.event_date));
  }, [rows, since, pos, comp.selected, kinds, dirs, squad, fol, follows, order]); // eslint-disable-line react-hooks/exhaustive-deps

  const isBatch = (r: MoverRow) => r.event_type === "selection_called" || r.event_type === "selection_left_out";
  const batch = shown.filter(isBatch);
  const rest = shown.filter((r) => !isBatch(r));
  const visible = all ? rest : rest.slice(0, LIMIT);
  const toggle = (key: string, list: string[], v: string) => set({ [key]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",") });

  const columns = useMemo<ColumnSpec[]>(
    () => [
      { key: "event_date", label: d.common.date, render: (r) => <span className="font-mono text-xs text-muted">{fmtDate(locale, r.event_date as string, false)}</span> },
      {
        key: "event_type",
        label: d.movers.kindCol,
        render: (r) => <span className="font-mono text-[11px] uppercase tracking-wide text-ink-2">{(d.movers.kindShort as Record<string, string>)[r.event_type as string] ?? r.event_type}</span>,
      },
      { key: "full_name", label: d.common.player, render: (r) => <MoverWho m={r as unknown as MoverRow} locale={locale} /> },
      { key: "pos_rank", label: d.common.position, kind: "int", priority: 2, render: (r) => (r.pos_rank ? `${(d.posShort as Record<string, string>)[r.pos_group as string]} ${r.pos_rank}` : "") },
      {
        key: "importance",
        label: d.pool.cols.arrow,
        align: "r",
        sortValue: (r) => moverChange(r as unknown as MoverRow) ?? (r.direction === "up" ? 0.5 : r.direction === "down" ? -0.5 : 0),
        render: (r) => <MoverMark m={r as unknown as MoverRow} />,
      },
      { key: "evidence", label: d.movers.fact, sortable: false, priority: 2, maxWidth: "24rem", render: (r) => moverFact(r as unknown as MoverRow, locale, ctx) },
      {
        key: "state",
        label: d.common.state,
        priority: 3,
        render: (r) => (r.state ? <StateWord label={stateLabel(d, r.state as MoverRow["state"])} tone={stateTone(r.state as MoverRow["state"])} /> : ""),
      },
      { key: "follow", label: "", sortable: false, render: (r) => <FollowStar playerKey={r.player_key as string} locale={locale} /> },
    ],
    [d, locale, ctx],
  );

  return (
    <>
      <FilterBar
        toggleLabel={d.common.filters}
        always={
          <FilterRow label={d.common.period}>
            <Segmented<Period>
              label={d.common.period}
              options={[
                { value: "7", label: d.movers.periods["7"] },
                { value: "14", label: d.movers.periods["14"] },
                { value: "28", label: d.movers.periods["28"] },
                ...(lastAnnouncement ? [{ value: "window" as Period, label: d.movers.periods.window }] : []),
              ]}
              value={period}
              onChange={(v) => set({ period: v === "28" ? null : v })}
            />
          </FilterRow>
        }
      >
        <FilterRow label={d.common.sortBy}>
          <Segmented
            label={d.common.sortBy}
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
        </FilterRow>
        <FilterRow label={d.common.filters}>
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
        <CompetitionChips competitions={competitions} locale={locale} filter={comp} />
      </FilterBar>

      <p className="num mb-3 font-mono text-xs text-muted">
        {d.movers.count(shown.length)} · {fmtDate(locale, since, false)} → {fmtDate(locale, horizon)}
      </p>

      {batch.length > 0 && (
        <div className="mb-6">
          <Panel title={d.movers.squadBatch(lastWindowLabel ?? "")} aside={<span className="num font-mono text-xs">{batch.length}</span>}>
            <PanelRows rows={batch.map((m) => ({ key: m.event_key, left: <MoverWho m={m} locale={locale} />, right: (d.movers.kindShort as Record<string, string>)[m.event_type] }))} />
          </Panel>
        </div>
      )}

      {rest.length === 0 && batch.length === 0 ? (
        <p className="text-sm text-muted">{d.movers.quiet}</p>
      ) : (
        rest.length > 0 && (
          <>
            <SortableTable columns={columns} rows={visible as unknown as Row[]} emptyText={d.movers.quiet} LinkComponent={AppLink} caption={d.movers.title} rowKey={(r) => r.event_key as string} />
            {rest.length > LIMIT && (
              <button type="button" className="hit mt-3 text-xs text-celeste-deep hover:underline" aria-expanded={all} onClick={() => setAll(!all)}>
                {all ? d.common.showFewer : d.common.showMore(rest.length - LIMIT)}
              </button>
            )}
          </>
        )
      )}
    </>
  );
}
