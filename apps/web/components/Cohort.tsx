"use client";

import { AgeScatter, type ColumnSpec, FilterBar, Menu, MenuCheck, MenuGroup, MenuRadio, MenuRule, type Row, SortableTable, Tag } from "@albiceleste/ui";
import type { AgeBand, Competition, TrajectoryRow } from "@albiceleste/data";
import { useMemo, useState } from "react";
import { CompetitionMenu } from "@/components/CompetitionMenu";
import { FollowStar } from "@/components/FollowStar";
import { useCompetitionFilter } from "@/lib/compfilter";
import { facetValue } from "@/lib/facet";
import { fmtDate, fmtDec, fmtInt, fmtPct, shareToPct } from "@/lib/fmt";
import { countryName } from "@/lib/geo";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { useFollows, useNotes } from "@/lib/store";
import { boolParam, listParam, useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;
const LIMIT = 40;

/** Four age-against-index panels, followed players filled. */
export function CohortScatter({ rows, band, locale }: { rows: TrajectoryRow[]; band: AgeBand[]; locale: Locale }) {
  const d = t(locale);
  const { follows } = useFollows();
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {GROUPS.map((g) => (
        <div key={g}>
          <h3 className="mb-1 font-mono text-[11px] font-medium uppercase tracking-wide text-muted">{d.pos[g]}</h3>
          <AgeScatter
            points={rows
              .filter((r) => r.pos_group === g && r.activity_index !== null && r.age !== null)
              .map((r) => ({
                key: r.player_key,
                label: `${r.full_name} (${r.team ?? ""})`,
                age: r.age!,
                value: r.activity_index!,
                followed: follows.includes(r.player_key),
                href: routes.player(locale, r.player_key),
              }))}
            band={band}
            width={300}
            height={200}
            label={`${d.next.curve} · ${d.pos[g]}`}
          />
        </div>
      ))}
    </div>
  );
}

/** The cohort list: trajectory columns, U21 and followed toggles, position chips. Forty rows by default. */
export function CohortExplorer({ rows, competitions, locale }: { rows: TrajectoryRow[]; competitions: Competition[]; locale: Locale }) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const comp = useCompetitionFilter();
  const { follows } = useFollows();
  const { notes } = useNotes();
  const pos = listParam(get("pos"));
  const u21 = boolParam(get("u21"));
  const fol = boolParam(get("fol"));
  const abroad = get("where");
  const [all, setAll] = useState(false);
  const noteCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.player_key, (m.get(n.player_key) ?? 0) + 1);
    return m;
  }, [notes]);

  const shown = useMemo(
    () =>
      rows
        .filter(
          (r) =>
            (pos.length === 0 || (r.pos_group !== null && pos.includes(r.pos_group))) &&
            (!u21 || (r.age !== null && r.age <= 21)) &&
            (!fol || follows.includes(r.player_key)) &&
            comp.matches(r.league) &&
            (abroad === null || (abroad === "abroad" ? r.is_abroad : !r.is_abroad)),
        )
        .sort((a, b) => (b.trajectory ?? -1) - (a.trajectory ?? -1)),
    [rows, pos, u21, fol, follows, abroad, comp.selected], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const visible = all ? shown : shown.slice(0, LIMIT);

  const columns: ColumnSpec[] = [
    { key: "trajectory", label: d.next.cols.trajectory, kind: "dec2", render: (r) => fmtDec(locale, r.trajectory as number | null) },
    { key: "age_percentile", label: d.next.cols.pctl, kind: "int", priority: 3 },
    {
      key: "full_name",
      label: d.common.player,
      render: (r) => (
        <span className="inline-flex items-baseline gap-2">
          <AppLink className="link font-medium" href={routes.player(locale, r.player_key as string)}>
            {r.full_name as string}
          </AppLink>
          {r.dual_national_untied ? <Tag tone="accent">2×</Tag> : null}
          {noteCounts.get(r.player_key as string) ? <Tag>✎ {noteCounts.get(r.player_key as string)}</Tag> : null}
        </span>
      ),
    },
    { key: "age", label: d.common.age, kind: "int" },
    { key: "pos_group", label: d.common.position, priority: 2, render: (r) => (d.posShort as Record<string, string>)[(r.pos_group as string) ?? "UNK"] },
    { key: "team", label: d.common.club, maxWidth: "11rem" },
    { key: "competition", label: d.common.competition, priority: 3, maxWidth: "10rem" },
    { key: "activity_index", label: d.next.cols.index, kind: "dec2", priority: 2, render: (r) => fmtDec(locale, r.activity_index as number | null) },
    { key: "activity_index_year_ago", label: d.next.cols.yearAgo, kind: "dec2", priority: 3, render: (r) => fmtDec(locale, r.activity_index_year_ago as number | null) },
    { key: "minutes_this_season", label: d.next.cols.minutesNow, kind: "int", priority: 2 },
    { key: "minutes_last_season", label: d.next.cols.minutesPrev, kind: "int", priority: 3 },
    { key: "level_rank", label: d.next.cols.tierNow, kind: "int", priority: 3 },
    { key: "level_rank_year_ago", label: d.next.cols.tierPrev, kind: "int", priority: 3 },
    { key: "minutes_share", label: d.pool.cols.share, kind: "int", priority: 3, render: (r) => fmtPct(locale, shareToPct(r.minutes_share as number | null)) },
    {
      key: "first_senior_season",
      label: d.next.cols.firstSenior,
      kind: "int",
      priority: 3,
      render: (r) => (r.first_senior_season ? `${r.first_senior_season}${r.first_senior_age_approx ? ` (${r.first_senior_age_approx})` : ""}` : ""),
    },
    {
      key: "first_abroad_date",
      label: d.next.cols.firstAbroad,
      priority: 3,
      maxWidth: "12rem",
      render: (r) =>
        r.first_abroad_date
          ? `${fmtDate(locale, r.first_abroad_date as string, false)} → ${countryName(locale, r.first_abroad_country as string | null)}${r.first_abroad_age ? ` (${r.first_abroad_age})` : ""}`
          : "",
    },
    { key: "follow", label: "", sortable: false, render: (r) => <FollowStar playerKey={r.player_key as string} locale={locale} /> },
  ];
  const filterNames = [u21 && d.next.u21, fol && d.common.followedOnly, abroad === "home" && d.next.home, abroad === "abroad" && d.next.abroad].filter((x): x is string => typeof x === "string");
  const toggle = (key: string, list: string[], v: string) => set({ [key]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",") });

  return (
    <>
      <FilterBar>
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
              <MenuCheck key={g} checked={pos.includes(g)} onChange={() => toggle("pos", pos, g)}>
                {d.pos[g]}
              </MenuCheck>
            ))}
          </Menu>
          <CompetitionMenu competitions={competitions} locale={locale} filter={comp} />
          <Menu label={d.common.filters} value={facetValue(filterNames, String)} active={filterNames.length > 0}>
            <MenuCheck checked={u21} onChange={() => set({ u21: u21 ? null : "1" })}>
              {d.next.u21}
            </MenuCheck>
            <MenuCheck checked={fol} onChange={() => set({ fol: fol ? null : "1" })}>
              {d.common.followedOnly}
            </MenuCheck>
            <MenuRule />
            <MenuGroup radio label={d.next.whereLabel}>
              <MenuRadio checked={abroad === null} close={false} onSelect={() => set({ where: null })}>
                {d.common.all}
              </MenuRadio>
              <MenuRadio checked={abroad === "home"} close={false} onSelect={() => set({ where: "home" })}>
                {d.next.home}
              </MenuRadio>
              <MenuRadio checked={abroad === "abroad"} close={false} onSelect={() => set({ where: "abroad" })}>
                {d.next.abroad}
              </MenuRadio>
            </MenuGroup>
          </Menu>
          <span className="num font-mono text-xs text-muted">{d.pool.count(shown.length, rows.length)}</span>
        </div>
      </FilterBar>
      <SortableTable columns={columns} rows={visible as unknown as Row[]} emptyText={d.common.empty} LinkComponent={AppLink} caption={d.next.list} />
      {shown.length > LIMIT && (
        <button type="button" className="hit mt-3 text-xs text-celeste-deep hover:underline" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? d.common.showFewer : d.common.showMore(shown.length - LIMIT)}
        </button>
      )}
    </>
  );
}
