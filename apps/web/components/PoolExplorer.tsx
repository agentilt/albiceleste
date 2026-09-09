"use client";

import { type ColumnSpec, Field, FilterBar, FilterRow, Hint, Menu, MenuCheck, MenuField, MenuRule, RankArrow, type Row, Segmented, SortableTable, StateWord, Tag } from "@albiceleste/ui";
import type { Competition, PoolRow } from "@albiceleste/data";
import { useMemo } from "react";
import { CompetitionMenu } from "@/components/CompetitionMenu";
import { FollowStar } from "@/components/FollowStar";
import { PitchDepth } from "@/components/PitchDepth";
import { useCompetitionFilter } from "@/lib/compfilter";
import { downloadText, toCsv } from "@/lib/download";
import { facetValue } from "@/lib/facet";
import { fmtDate, fmtDec, fmtEur, fmtInt, fmtKickoff, fmtPct, shareToPct } from "@/lib/fmt";
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
  const comp = useCompetitionFilter();
  const { follows } = useFollows();
  const { notes } = useNotes();
  const noteCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.player_key, (m.get(n.player_key) ?? 0) + 1);
    return m;
  }, [notes]);

  const view = get("v") === "flat" ? "flat" : get("v") === "pitch" ? "pitch" : "depth";
  const pos = listParam(get("pos"));
  const ageMin = numParam(get("amin"), 15);
  const ageMax = numParam(get("amax"), 45);
  const minMinutes = numParam(get("min"), 0);
  const review = boolParam(get("review"), false);
  const squad = boolParam(get("squad"));
  const inf = boolParam(get("inf"));
  const fol = boolParam(get("fol"));
  const u23 = boolParam(get("u23"));
  const scope = get("scope") === "all" ? "all" : "watch";
  const tiers = new Set(listParam(get("cols") ?? "form") as Tier[]);
  const sort = get("sort") ?? undefined;
  const dir: "asc" | "desc" = get("dir") === "asc" ? "asc" : "desc";

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (pos.length === 0 || pos.includes(r.pos_group)) &&
          comp.matches(r.league) &&
          (r.age === null || (r.age >= ageMin && r.age <= ageMax)) &&
          (r.season_minutes ?? 0) >= minMinutes &&
          (review || r.eligibility_status === "eligible") &&
          (!squad || r.in_last_squad) &&
          (!inf || r.infirmary_reason !== null) &&
          (!fol || follows.includes(r.player_key)) &&
          (!u23 || (r.age !== null && r.age <= 23)) &&
          (scope === "all" || r.in_watch) &&
          r.state !== "retired",
      ),
    [rows, pos, comp.selected, ageMin, ageMax, minMinutes, review, squad, inf, fol, u23, scope, follows], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const columns = useMemo<ColumnSpec[]>(() => {
    const isDef = pos.length > 0 && pos.every((p) => p === "GK" || p === "DEF");
    const base: ColumnSpec[] = [
      { key: "pos_rank", label: "#", kind: "int", width: "3rem" },
      {
        key: "rank_change",
        label: d.pool.cols.arrow,
        kind: "int",
        render: (r) => <RankArrow change={r.rank_change as number | null} className="text-xs" />,
      },
      {
        key: "full_name",
        label: d.common.player,
        render: (r) => (
          <span className="inline-flex items-baseline gap-2 whitespace-nowrap">
            <AppLink className="link font-medium" href={routes.player(locale, r.player_key as string)}>
              {r.full_name as string}
            </AppLink>
            {r.in_last_squad ? (
              <Tag tone="accent" title={lastListLabel ?? undefined}>
                {d.marks.lastSquadShort}
              </Tag>
            ) : null}
            {r.eligibility_status === "review" ? <Tag>{d.marks.review}</Tag> : null}
            {noteCounts.get(r.player_key as string) ? <Tag>✎ {noteCounts.get(r.player_key as string)}</Tag> : null}
          </span>
        ),
      },
      { key: "age", label: d.common.age, kind: "int", priority: 2 },
      ...(view === "flat"
        ? [
            {
              key: "pos_group",
              label: d.common.position,
              render: (r: Row) => (d.posShort as Record<string, string>)[r.pos_group as string],
            } as ColumnSpec,
          ]
        : []),
      { key: "team", label: d.common.club, maxWidth: "11rem" },
      {
        key: "state",
        label: d.common.state,
        priority: 2,
        render: (r) => <StateWord label={stateLabel(d, r.state as PoolRow["state"], r.infirmary_reason as PoolRow["infirmary_reason"])} tone={stateTone(r.state as PoolRow["state"])} />,
      },
      {
        key: "competition",
        label: d.common.competition,
        priority: 3,
        maxWidth: "10rem",
      },
    ];
    const form: ColumnSpec[] = [
      {
        key: "season_minutes",
        label: d.common.minutes,
        kind: "int",
        title: d.common.thisSeason,
      },
      {
        key: "season_minutes_share",
        label: d.pool.cols.share,
        title: d.pool.cols.shareTitle,
        kind: "int",
        priority: 3,
        render: (r) => fmtPct(locale, shareToPct(r.season_minutes_share as number | null)),
      },
      {
        key: "season_starts",
        label: d.pool.cols.startsApps,
        kind: "int",
        priority: 2,
        render: (r) => `${fmtInt(locale, r.season_starts as number | null)} / ${fmtInt(locale, r.season_apps as number | null)}`,
      },
      { key: "min_28", label: d.pool.cols.minutes28, kind: "int", priority: 2 },
      {
        key: "min_prev_28",
        label: d.pool.cols.prev28,
        kind: "int",
        priority: 3,
      },
      {
        key: "min_change_pct",
        label: d.pool.cols.change28,
        kind: "pctSigned",
        priority: 2,
        render: (r) => fmtPct(locale, r.min_change_pct as number | null, true),
      },
    ];
    const production: ColumnSpec[] = isDef
      ? [
          {
            key: "season_conceded",
            label: d.common.conceded,
            kind: "int",
            priority: 2,
          },
          {
            key: "season_clean_sheets",
            label: d.common.cleanSheets,
            kind: "int",
            priority: 2,
          },
          {
            key: "conceded_per90",
            label: d.common.concededPer90,
            kind: "dec2",
            priority: 3,
            render: (r) => fmtDec(locale, r.conceded_per90 as number | null),
          },
        ]
      : [
          {
            key: "season_goals",
            label: d.common.goals,
            kind: "int",
            priority: 2,
          },
          {
            key: "season_assists",
            label: d.common.assists,
            kind: "int",
            priority: 2,
          },
          {
            key: "ga_per90",
            label: d.common.per90,
            kind: "dec2",
            priority: 3,
            render: (r) => fmtDec(locale, r.ga_per90 as number | null),
          },
          {
            key: "season_conceded",
            label: d.common.conceded,
            kind: "int",
            title: "GK/DEF",
            priority: 3,
          },
          {
            key: "season_clean_sheets",
            label: d.common.cleanSheets,
            kind: "int",
            title: "GK/DEF",
            priority: 3,
          },
        ];
    const support: ColumnSpec[] = [
      {
        key: "avg_rating",
        label: d.common.rating,
        kind: "dec2",
        priority: 2,
        render: (r) => fmtDec(locale, r.avg_rating as number | null),
      },
      {
        key: "xg",
        label: "xG",
        kind: "dec2",
        priority: 3,
        render: (r) => fmtDec(locale, r.xg as number | null),
      },
      {
        key: "xa",
        label: "xA",
        kind: "dec2",
        priority: 3,
        render: (r) => fmtDec(locale, r.xa as number | null),
      },
      {
        key: "market_value_eur",
        label: d.common.value,
        kind: "eur",
        priority: 3,
        render: (r) => fmtEur(locale, r.market_value_eur as number | null),
      },
      { key: "level_rank", label: d.common.tier, kind: "int", priority: 3 },
    ];
    const next: ColumnSpec[] = [
      {
        key: "next_opponent",
        label: d.pool.cols.nextMatch,
        priority: 2,
        maxWidth: "11rem",
        render: (r) => (r.next_opponent ? `${r.next_is_home ? d.common.vs : "@"} ${r.next_opponent}` : ""),
      },
      {
        key: "next_kickoff",
        label: d.pool.cols.kickoff,
        priority: 3,
        render: (r) => fmtKickoff(locale, r.next_kickoff as string | null),
      },
    ];
    const tail: ColumnSpec[] = [
      {
        key: "follow",
        label: "",
        sortable: false,
        render: (r) => <FollowStar playerKey={r.player_key as string} locale={locale} />,
      },
    ];
    return [...base, ...(tiers.has("form") ? form : []), ...(tiers.has("production") ? production : []), ...(tiers.has("support") ? support : []), ...(tiers.has("next") ? next : []), ...tail];
  }, [d, locale, view, tiers, pos, noteCounts, lastListLabel]);

  function toggleList(key: string, list: string[], v: string) {
    const next = list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
    set({ [key]: next.join(",") });
  }

  function csv() {
    const cols = columns.filter((c) => c.key !== "follow").map((c) => ({ key: c.key, label: c.label || c.key }));
    const body = toCsv(shown as unknown as Record<string, unknown>[], cols);
    downloadText(`albiceleste-pool-${horizon}.csv`, `# ${d.pool.downloadNote(fmtDate(locale, horizon))}\n${body}`, "text/csv");
  }
  function json() {
    downloadText(
      `albiceleste-pool-${horizon}.json`,
      JSON.stringify(
        {
          note: d.pool.downloadNote(fmtDate(locale, horizon)),
          data_as_of: horizon,
          players: rows,
        },
        null,
        1,
      ),
      "application/json",
    );
  }

  const filterNames = [
    squad && d.pool.lastSquad,
    inf && d.pool.infirmary,
    fol && d.common.followedOnly,
    u23 && d.pool.u23,
    review && d.pool.review,
    (ageMin !== 15 || ageMax !== 45) && `${d.pool.ageRange} ${ageMin}–${ageMax}`,
    minMinutes > 0 && `≥ ${fmtInt(locale, minMinutes)}′`,
  ].filter((x): x is string => typeof x === "string");
  const tierNames = TIERS.filter((x) => tiers.has(x)).map((x) => d.pool.tiers[x]);

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
        <FilterRow label={d.pool.scope}>
          <Segmented
            label={d.pool.scope}
            options={[
              { value: "watch", label: d.pool.scopeWatch },
              { value: "all", label: d.pool.scopeAll },
            ]}
            value={scope}
            onChange={(v) => set({ scope: v === "all" ? "all" : null })}
          />
          <Hint text={d.pool.scopeNote} />
          <span className="ml-2 font-mono text-[11px] uppercase tracking-wide text-muted">{d.common.view}</span>
          <Segmented
            label={d.common.view}
            options={[
              { value: "depth", label: d.pool.depth },
              { value: "pitch", label: d.pool.pitch },
              { value: "flat", label: d.pool.flat },
            ]}
            value={view}
            onChange={(v) => set({ v: v === "depth" ? null : v, slot: null })}
          />
        </FilterRow>
        <div className="flex flex-wrap items-center gap-2">
          <Menu
            label={d.common.position}
            value={facetValue(
              pos.map((g) => d.pos[g as (typeof GROUPS)[number]]),
              d.common.nPositions,
            )}
            active={pos.length > 0}
          >
            {GROUPS.map((g) => (
              <MenuCheck key={g} checked={pos.includes(g)} onChange={() => toggleList("pos", pos, g)}>
                {d.pos[g]}
              </MenuCheck>
            ))}
          </Menu>
          <CompetitionMenu competitions={competitions} locale={locale} filter={comp} />
          <Menu label={d.common.filters} value={facetValue(filterNames, String)} active={filterNames.length > 0}>
            <MenuCheck checked={squad} onChange={() => set({ squad: squad ? null : "1" })}>
              {d.pool.lastSquad}
            </MenuCheck>
            <MenuCheck checked={inf} onChange={() => set({ inf: inf ? null : "1" })}>
              {d.pool.infirmary}
            </MenuCheck>
            <MenuCheck checked={fol} onChange={() => set({ fol: fol ? null : "1" })}>
              {d.common.followedOnly}
            </MenuCheck>
            <MenuCheck checked={u23} onChange={() => set({ u23: u23 ? null : "1" })}>
              {d.pool.u23}
            </MenuCheck>
            <MenuCheck checked={review} onChange={() => set({ review: review ? null : "1" })}>
              {d.pool.review}
            </MenuCheck>
            <MenuRule />
            <MenuField>
              <Field label={d.pool.ageRange}>
                <input type="number" id="age-min" name="age-min" min={15} max={45} value={ageMin} onChange={(e) => set({ amin: e.target.value })} className="w-16" />
                <span className="text-muted">–</span>
                <input type="number" id="age-max" name="age-max" min={15} max={45} value={ageMax} onChange={(e) => set({ amax: e.target.value })} className="w-16" />
              </Field>
            </MenuField>
            <MenuField>
              <Field label={d.pool.minMinutes}>
                <input type="number" id="min-minutes" name="min-minutes" min={0} step={90} value={minMinutes} onChange={(e) => set({ min: e.target.value })} className="w-20" />
              </Field>
            </MenuField>
          </Menu>
          <span className="num font-mono text-xs text-muted">{d.pool.count(shown.length, rows.length)}</span>
          <span className="ml-auto flex flex-wrap items-center gap-2">
            {view !== "pitch" && (
              <Menu label={d.common.columns} value={facetValue(tierNames, String) ?? d.common.none} active={!(tiers.size === 1 && tiers.has("form"))} align="right">
                {TIERS.map((tier) => (
                  <MenuCheck
                    key={tier}
                    checked={tiers.has(tier)}
                    onChange={() =>
                      set({
                        cols: (tiers.has(tier) ? TIERS.filter((x) => tiers.has(x) && x !== tier) : [...TIERS.filter((x) => tiers.has(x)), tier]).join(",") || "none",
                      })
                    }
                  >
                    {d.pool.tiers[tier]}
                  </MenuCheck>
                ))}
              </Menu>
            )}
            <button type="button" className="chip" onClick={csv} title={d.common.csv}>
              <span className="sm:hidden">CSV</span>
              <span className="hidden sm:inline">{d.common.csv}</span>
            </button>
            <button type="button" className="chip" onClick={json} title={d.common.json}>
              <span className="sm:hidden">JSON</span>
              <span className="hidden sm:inline">{d.common.json}</span>
            </button>
          </span>
        </div>
      </FilterBar>

      {view === "pitch" ? (
        <PitchDepth rows={shown} locale={locale} />
      ) : view === "flat" ? (
        <SortableTable {...tableProps} rows={shown as unknown as Row[]} initialSort="pos_rank" initialDir="asc" caption={d.pool.title} />
      ) : (
        <SortableTable
          {...tableProps}
          rows={[...shown].sort((a, b) => (a.pos_rank ?? 9999) - (b.pos_rank ?? 9999) || a.full_name.localeCompare(b.full_name)) as unknown as Row[]}
          caption={d.pool.title}
          groupBy={{
            of: (r) => r.pos_group as string,
            order: [...GROUPS],
            label: (k, n) => `${d.pos[k as (typeof GROUPS)[number]]} · ${n}`,
          }}
        />
      )}
    </>
  );
}
