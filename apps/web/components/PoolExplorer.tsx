"use client";

import { Chip, type ColumnSpec, Field, FilterBar, FilterRow, Note, RankArrow, type Row, Segmented, SortableTable, StateWord, Tag } from "@albiceleste/ui";
import type { Competition, PoolRow } from "@albiceleste/data";
import { useMemo } from "react";
import { FollowStar } from "@/components/FollowStar";
import { downloadText, toCsv } from "@/lib/download";
import { fmtDec, fmtEur, fmtInt, fmtKickoff, fmtPct, shareToPct } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { stateLabel, stateTone } from "@/lib/state";
import { useFollows, useNotes } from "@/lib/store";
import { boolParam, listParam, numParam, useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;
type Tier = "form" | "production" | "support" | "next";
const TIERS: Tier[] = ["form", "production", "support", "next"];

export function PoolExplorer({ rows, competitions, locale, horizon, lastListLabel }: { rows: PoolRow[]; competitions: Competition[]; locale: Locale; horizon: string; lastListLabel: string | null }) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const { follows } = useFollows();
  const { notes } = useNotes();
  const noteCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.player_key, (m.get(n.player_key) ?? 0) + 1);
    return m;
  }, [notes]);

  const view = get("v") === "flat" ? "flat" : "depth";
  const pos = listParam(get("pos"));
  const comp = listParam(get("comp"));
  const ageMin = numParam(get("amin"), 15);
  const ageMax = numParam(get("amax"), 45);
  const minMinutes = numParam(get("min"), 0);
  const review = boolParam(get("review"), false);
  const squad = boolParam(get("squad"));
  const inf = boolParam(get("inf"));
  const fol = boolParam(get("fol"));
  const u23 = boolParam(get("u23"));
  const lens = get("lens") === "all" ? "all" : "focus";
  const tiers = new Set(listParam(get("cols") ?? "form") as Tier[]);
  const sort = get("sort") ?? undefined;
  const dir: "asc" | "desc" = get("dir") === "asc" ? "asc" : "desc";

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (pos.length === 0 || pos.includes(r.pos_group)) &&
          (comp.length === 0 || (r.league !== null && comp.includes(r.league))) &&
          (r.age === null || (r.age >= ageMin && r.age <= ageMax)) &&
          (r.season_minutes ?? 0) >= minMinutes &&
          (review || r.eligibility_status === "eligible") &&
          (!squad || r.in_last_squad) &&
          (!inf || r.infirmary_reason !== null) &&
          (!fol || follows.includes(r.player_key)) &&
          (!u23 || (r.age !== null && r.age <= 23)) &&
          (lens === "all" || r.is_abroad || r.in_focus) &&
          r.state !== "retired",
      ),
    [rows, pos, comp, ageMin, ageMax, minMinutes, review, squad, inf, fol, u23, lens, follows],
  );

  const columns = useMemo<ColumnSpec[]>(() => {
    const isDef = pos.length > 0 && pos.every((p) => p === "GK" || p === "DEF");
    const base: ColumnSpec[] = [
      { key: "pos_rank", label: "#", kind: "int", width: "3rem" },
      { key: "rank_change", label: d.pool.cols.arrow, kind: "int", render: (r) => <RankArrow change={r.rank_change as number | null} className="text-xs" /> },
      { key: "state", label: d.common.state, render: (r) => <StateWord label={stateLabel(d, r.state as PoolRow["state"], r.infirmary_reason as PoolRow["infirmary_reason"])} tone={stateTone(r.state as PoolRow["state"])} /> },
      {
        key: "full_name",
        label: d.common.player,
        render: (r) => (
          <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
            <AppLink className="link font-medium" href={routes.player(locale, r.player_key as string)}>
              {r.full_name as string}
            </AppLink>
            {r.in_last_squad ? <Tag tone="accent" title={lastListLabel ?? undefined}>{d.marks.lastSquadShort}</Tag> : null}
            {r.eligibility_status === "review" ? <Tag>{d.marks.review}</Tag> : null}
            {noteCounts.get(r.player_key as string) ? <Tag>✎ {noteCounts.get(r.player_key as string)}</Tag> : null}
          </span>
        ),
      },
      { key: "age", label: d.common.age, kind: "int" },
      ...(view === "flat" ? [{ key: "pos_group", label: d.common.position, render: (r: Row) => (d.posShort as Record<string, string>)[r.pos_group as string] } as ColumnSpec] : []),
      { key: "team", label: d.common.club },
      { key: "competition", label: d.common.competition },
    ];
    const form: ColumnSpec[] = [
      { key: "season_minutes", label: d.common.minutes, kind: "int", title: d.common.thisSeason },
      { key: "season_minutes_share", label: d.pool.cols.share, title: d.pool.cols.shareTitle, kind: "int", render: (r) => fmtPct(locale, shareToPct(r.season_minutes_share as number | null)) },
      { key: "season_starts", label: d.pool.cols.startsApps, kind: "int", render: (r) => `${fmtInt(locale, r.season_starts as number | null)} / ${fmtInt(locale, r.season_apps as number | null)}` },
      { key: "min_28", label: d.pool.cols.minutes28, kind: "int" },
      { key: "min_prev_28", label: d.pool.cols.prev28, kind: "int" },
      { key: "min_change_pct", label: d.pool.cols.change28, kind: "pctSigned", render: (r) => fmtPct(locale, r.min_change_pct as number | null, true) },
    ];
    const production: ColumnSpec[] = isDef
      ? [
          { key: "season_conceded", label: d.common.conceded, kind: "int" },
          { key: "season_clean_sheets", label: d.common.cleanSheets, kind: "int" },
          { key: "conceded_per90", label: d.common.concededPer90, kind: "dec2", render: (r) => fmtDec(locale, r.conceded_per90 as number | null) },
        ]
      : [
          { key: "season_goals", label: d.common.goals, kind: "int" },
          { key: "season_assists", label: d.common.assists, kind: "int" },
          { key: "ga_per90", label: d.common.per90, kind: "dec2", render: (r) => fmtDec(locale, r.ga_per90 as number | null) },
          { key: "season_conceded", label: d.common.conceded, kind: "int", title: "GK/DEF" },
          { key: "season_clean_sheets", label: d.common.cleanSheets, kind: "int", title: "GK/DEF" },
        ];
    const support: ColumnSpec[] = [
      { key: "avg_rating", label: d.common.rating, kind: "dec2", render: (r) => fmtDec(locale, r.avg_rating as number | null) },
      { key: "xg", label: "xG", kind: "dec2", render: (r) => fmtDec(locale, r.xg as number | null) },
      { key: "xa", label: "xA", kind: "dec2", render: (r) => fmtDec(locale, r.xa as number | null) },
      { key: "market_value_eur", label: d.common.value, kind: "eur", render: (r) => fmtEur(locale, r.market_value_eur as number | null) },
      { key: "level_rank", label: d.common.tier, kind: "int" },
    ];
    const next: ColumnSpec[] = [
      { key: "next_opponent", label: d.pool.cols.nextMatch, render: (r) => (r.next_opponent ? `${r.next_is_home ? d.common.vs : "@"} ${r.next_opponent}` : "") },
      { key: "next_kickoff", label: d.pool.cols.kickoff, render: (r) => fmtKickoff(locale, r.next_kickoff as string | null) },
    ];
    const tail: ColumnSpec[] = [{ key: "follow", label: "", sortable: false, render: (r) => <FollowStar playerKey={r.player_key as string} locale={locale} /> }];
    return [...base, ...(tiers.has("form") ? form : []), ...(tiers.has("production") ? production : []), ...(tiers.has("support") ? support : []), ...(tiers.has("next") ? next : []), ...tail];
  }, [d, locale, view, tiers, pos, noteCounts, lastListLabel]);

  function toggleList(key: string, list: string[], v: string) {
    const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    set({ [key]: next.join(",") });
  }

  function csv() {
    const cols = columns.filter((c) => c.key !== "follow").map((c) => ({ key: c.key, label: c.label || c.key }));
    const body = toCsv(shown as unknown as Record<string, unknown>[], cols);
    downloadText(`albiceleste-pool-${horizon}.csv`, `# ${d.pool.downloadNote(horizon)}\n${body}`, "text/csv");
  }
  function json() {
    downloadText(`albiceleste-pool-${horizon}.json`, JSON.stringify({ note: d.pool.downloadNote(horizon), data_as_of: horizon, players: rows }, null, 1), "application/json");
  }

  const tableProps = {
    columns,
    sort,
    dir,
    onSortChange: (s: string | undefined, dd: "asc" | "desc") => set({ sort: s ?? null, dir: dd }),
    emptyText: d.common.empty,
    LinkComponent: AppLink,
  };

  return (
    <>
      <FilterBar>
        <FilterRow label={d.common.view}>
          <Segmented
            options={[
              { value: "depth", label: d.pool.depth },
              { value: "flat", label: d.pool.flat },
            ]}
            value={view}
            onChange={(v) => set({ v: v === "flat" ? "flat" : null })}
          />
          <span className="ml-4 text-xs uppercase tracking-wide text-muted">{d.common.columns}</span>
          {TIERS.map((tier) => (
            <Chip key={tier} pressed={tiers.has(tier)} onClick={() => set({ cols: (tiers.has(tier) ? TIERS.filter((x) => tiers.has(x) && x !== tier) : [...TIERS.filter((x) => tiers.has(x)), tier]).join(",") || "none" })}>
              {d.pool.tiers[tier]}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={d.common.position}>
          {GROUPS.map((g) => (
            <Chip key={g} pressed={pos.includes(g)} onClick={() => toggleList("pos", pos, g)}>
              {d.pos[g]}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={d.common.competition}>
          {competitions.map((c) => (
            <Chip key={c.league} pressed={comp.includes(c.league)} onClick={() => toggleList("comp", comp, c.league)}>
              {c.competition_name}
            </Chip>
          ))}
        </FilterRow>
        <FilterRow label={d.common.filters}>
          <Chip pressed={squad} onClick={() => set({ squad: squad ? null : "1" })}>
            {d.pool.lastSquad}
          </Chip>
          <Chip pressed={inf} onClick={() => set({ inf: inf ? null : "1" })}>
            {d.pool.infirmary}
          </Chip>
          <Chip pressed={fol} onClick={() => set({ fol: fol ? null : "1" })}>
            {d.common.followedOnly}
          </Chip>
          <Chip pressed={u23} onClick={() => set({ u23: u23 ? null : "1" })}>
            {d.pool.u23}
          </Chip>
          <Chip pressed={review} onClick={() => set({ review: review ? null : "1" })}>
            {d.pool.review}
          </Chip>
          <span className="ml-2 text-xs uppercase tracking-wide text-muted">{d.pool.lens}</span>
          <Segmented
            options={[
              { value: "focus", label: d.pool.lensFocus },
              { value: "all", label: d.pool.lensAll },
            ]}
            value={lens}
            onChange={(v) => set({ lens: v === "all" ? "all" : null })}
          />
        </FilterRow>
        <div className="flex flex-wrap items-center gap-5">
          <Field label={d.pool.ageRange}>
            <input type="number" min={15} max={45} value={ageMin} onChange={(e) => set({ amin: e.target.value })} className="w-16" />
            <span className="text-muted">–</span>
            <input type="number" min={15} max={45} value={ageMax} onChange={(e) => set({ amax: e.target.value })} className="w-16" />
          </Field>
          <Field label={d.pool.minMinutes}>
            <input type="number" min={0} step={90} value={minMinutes} onChange={(e) => set({ min: e.target.value })} className="w-20" />
          </Field>
          <span className="text-sm text-muted">{d.pool.count(shown.length, rows.length)}</span>
          <span className="ml-auto flex gap-2 text-sm">
            <button type="button" className="chip" onClick={csv}>
              {d.common.csv}
            </button>
            <button type="button" className="chip" onClick={json}>
              {d.common.json}
            </button>
          </span>
        </div>
      </FilterBar>

      {view === "flat" ? (
        <SortableTable {...tableProps} rows={shown as unknown as Row[]} initialSort="pos_rank" initialDir="asc" />
      ) : (
        <div className="flex flex-col gap-10">
          {GROUPS.filter((g) => pos.length === 0 || pos.includes(g)).map((g) => {
            const groupRows = shown.filter((r) => r.pos_group === g).sort((a, b) => (a.pos_rank ?? 9999) - (b.pos_rank ?? 9999) || a.full_name.localeCompare(b.full_name));
            return (
              <section key={g}>
                <h2 className="mb-2 border-b border-rule-strong pb-1 text-xl">
                  {d.pos[g]} <span className="text-sm text-muted">{groupRows.length}</span>
                </h2>
                <SortableTable {...tableProps} rows={groupRows as unknown as Row[]} sticky={false} />
              </section>
            );
          })}
        </div>
      )}
      <Note>
        {d.pool.lensNote} {d.pool.downloadNote(horizon)}
      </Note>
    </>
  );
}
