"use client";

import { AgeScatter, Chip, type ColumnSpec, FilterBar, FilterRow, type Row, SortableTable, Tag } from "@albiceleste/ui";
import type { AgeBand, Competition, TrajectoryRow } from "@albiceleste/data";
import { useMemo } from "react";
import { CompetitionChips } from "@/components/CompetitionChips";
import { FollowStar } from "@/components/FollowStar";
import { useCompetitionFilter } from "@/lib/compfilter";
import { fmtDate, fmtDec, fmtInt, fmtPct, shareToPct } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { useFollows, useNotes } from "@/lib/store";
import { boolParam, listParam, useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;

/** Four age-against-index panels, followed players filled. */
export function CohortScatter({ rows, band, locale }: { rows: TrajectoryRow[]; band: AgeBand[]; locale: Locale }) {
  const d = t(locale);
  const { follows } = useFollows();
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {GROUPS.map((g) => (
        <div key={g}>
          <h3 className="mb-1 font-sans text-xs font-medium uppercase tracking-wide text-muted">{d.pos[g]}</h3>
          <AgeScatter
            points={rows
              .filter((r) => r.pos_group === g && r.activity_index !== null && r.age !== null)
              .map((r) => ({ key: r.player_key, label: `${r.full_name} (${r.team ?? ""})`, age: r.age!, value: r.activity_index!, followed: follows.includes(r.player_key), href: routes.player(locale, r.player_key) }))}
            band={band}
            width={300}
            height={200}
          />
        </div>
      ))}
    </div>
  );
}

/** The cohort list: trajectory columns, U21 and followed toggles, position chips. */
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
  const noteCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const n of notes) m.set(n.player_key, (m.get(n.player_key) ?? 0) + 1);
    return m;
  }, [notes]);

  const shown = useMemo(
    () =>
      rows.filter(
        (r) =>
          (pos.length === 0 || (r.pos_group !== null && pos.includes(r.pos_group))) &&
          (!u21 || (r.age !== null && r.age <= 21)) &&
          (!fol || follows.includes(r.player_key)) &&
          comp.matches(r.league) &&
          (abroad === null || (abroad === "abroad" ? r.is_abroad : !r.is_abroad)),
      ),
    [rows, pos, u21, fol, follows, abroad, comp.selected], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const columns: ColumnSpec[] = [
    { key: "trajectory", label: d.next.cols.trajectory, kind: "dec2", render: (r) => fmtDec(locale, r.trajectory as number | null) },
    { key: "age_percentile", label: d.next.cols.pctl, kind: "int" },
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
    { key: "pos_group", label: d.common.position, render: (r) => (d.posShort as Record<string, string>)[(r.pos_group as string) ?? "UNK"] },
    { key: "team", label: d.common.club },
    { key: "competition", label: d.common.competition },
    { key: "activity_index", label: d.next.cols.index, kind: "dec2", render: (r) => fmtDec(locale, r.activity_index as number | null) },
    { key: "activity_index_year_ago", label: d.next.cols.yearAgo, kind: "dec2", render: (r) => fmtDec(locale, r.activity_index_year_ago as number | null) },
    { key: "minutes_this_season", label: d.next.cols.minutesNow, kind: "int" },
    { key: "minutes_last_season", label: d.next.cols.minutesPrev, kind: "int" },
    { key: "level_rank", label: d.next.cols.tierNow, kind: "int" },
    { key: "level_rank_year_ago", label: d.next.cols.tierPrev, kind: "int" },
    { key: "minutes_share", label: d.pool.cols.share, kind: "int", render: (r) => fmtPct(locale, shareToPct(r.minutes_share as number | null)) },
    { key: "first_senior_season", label: d.next.cols.firstSenior, kind: "int", render: (r) => (r.first_senior_season ? `${r.first_senior_season}${r.first_senior_age_approx ? ` (${r.first_senior_age_approx})` : ""}` : "") },
    { key: "first_abroad_date", label: d.next.cols.firstAbroad, render: (r) => (r.first_abroad_date ? `${fmtDate(locale, r.first_abroad_date as string, false)} → ${r.first_abroad_country ?? ""}${r.first_abroad_age ? ` (${r.first_abroad_age})` : ""}` : "") },
    { key: "follow", label: "", sortable: false, render: (r) => <FollowStar playerKey={r.player_key as string} locale={locale} /> },
  ];
  const toggle = (key: string, list: string[], v: string) => set({ [key]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",") });

  return (
    <>
      <FilterBar>
        <FilterRow label={d.common.filters}>
          {GROUPS.map((g) => (
            <Chip key={g} pressed={pos.includes(g)} onClick={() => toggle("pos", pos, g)}>
              {d.pos[g]}
            </Chip>
          ))}
          <Chip pressed={u21} onClick={() => set({ u21: u21 ? null : "1" })}>
            {d.next.u21}
          </Chip>
          <Chip pressed={fol} onClick={() => set({ fol: fol ? null : "1" })}>
            {d.common.followedOnly}
          </Chip>
          <Chip pressed={abroad === "home"} onClick={() => set({ where: abroad === "home" ? null : "home" })}>
            {d.pos.UNK === "" ? "" : "Liga argentina"}
          </Chip>
          <Chip pressed={abroad === "abroad"} onClick={() => set({ where: abroad === "abroad" ? null : "abroad" })}>
            {d.home.where.abroad(rows.filter((r) => r.is_abroad).length)}
          </Chip>
          <span className="text-sm text-muted">{d.pool.count(shown.length, rows.length)}</span>
        </FilterRow>
        <CompetitionChips competitions={competitions} locale={locale} filter={comp} />
      </FilterBar>
      <SortableTable columns={columns} rows={shown as unknown as Row[]} initialSort="trajectory" initialDir="desc" emptyText={d.common.empty} LinkComponent={AppLink} />
    </>
  );
}
