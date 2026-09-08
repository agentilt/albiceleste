import type { Metadata } from "next";
import { Suspense } from "react";
import { Bars, LineChart, Note, PageTitle, Section, StaticTable } from "@albiceleste/ui";
import { getAgeBands, getCompetitions, getExportsByCountry, getExportsByYear, getMovers, getTrajectory, getYouthEvents, manifest } from "@albiceleste/data";
import { CohortExplorer, CohortScatter } from "@/components/Cohort";
import { MoverLine } from "@/components/MoverLine";
import { eventContext } from "@/lib/ctx";
import { DASH, fmtDate, fmtDec, fmtInt } from "@/lib/fmt";
import { t } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { localeParams, readLocale } from "@/lib/params";
import { routes } from "@/lib/routes";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  return { title: t(locale).next.title };
}

const BREAKTHROUGH_KINDS = new Set(["debut_in_league", "first_start_of_season", "club_change", "selection_called", "multi_goal_match", "scoring_streak"]);

export default async function NextCyclePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const horizon = manifest().data_as_of;
  const [rows, band, youth, movers, byCountry, byYear, ctx, competitions] = await Promise.all([getTrajectory(), getAgeBands(), getYouthEvents(), getMovers(), getExportsByCountry(2015, 12), getExportsByYear(2015), eventContext(), getCompetitions()]);
  const keys = new Set(rows.map((r) => r.player_key));
  const breakthroughs = movers.filter((m) => keys.has(m.player_key) && BREAKTHROUGH_KINDS.has(m.event_type)).slice(0, 30);
  const retention = rows.filter((r) => r.dual_national_untied);
  const youthCapped = rows.filter((r) => r.has_arg_youth_cap);
  const cohortMoves = rows.filter((r) => r.first_abroad_date).sort((a, b) => b.first_abroad_date!.localeCompare(a.first_abroad_date!));

  return (
    <>
      <PageTitle title={d.next.title} lede={d.next.lede} />
      <p className="mb-2 font-mono text-sm">{d.next.cohort(rows.length, fmtDate(locale, horizon))}</p>
      <p className="mb-8 text-sm text-ink-2">
        <span className="text-muted">{d.next.calendar}: </span>
        {youth.map((y, i) => (
          <span key={y.event_id}>
            {i > 0 && " · "}
            {locale === "es" ? y.label_es : y.label_en} ({fmtDate(locale, y.starts, false)} – {fmtDate(locale, y.ends)}
            {y.status === "expected" ? `, ${d.common.expected}` : ""})
          </span>
        ))}
      </p>

      <Section title={d.next.curve}>
        <CohortScatter rows={rows} band={band} locale={locale} />
        <Note>{d.next.curveNote}</Note>
      </Section>

      <Section title={d.next.list} aside={d.next.trajectory}>
        <Suspense>
          <CohortExplorer rows={rows} competitions={competitions} locale={locale} />
        </Suspense>
        <Note>{d.next.trajectoryNote}</Note>
      </Section>

      <Section title={d.next.retention}>
        <div id="retention" />
        {retention.length === 0 ? (
          <p className="text-sm text-muted">{d.next.retentionNone}</p>
        ) : (
          <StaticTable
            rows={retention}
            rowKey={(r) => r.player_key}
            cols={[
              {
                label: d.common.player,
                render: (r) => (
                  <AppLink className="link font-medium" href={routes.player(locale, r.player_key)}>
                    {r.full_name}
                  </AppLink>
                ),
              },
              { label: d.common.age, align: "r", render: (r) => fmtInt(locale, r.age) },
              { label: d.common.position, render: (r) => (d.posShort as Record<string, string>)[r.pos_group ?? "UNK"] },
              { label: d.common.club, render: (r) => `${r.team ?? DASH}${r.competition ? `, ${r.competition}` : ""}` },
              { label: d.common.country, render: (r) => (r.citizenships ?? []).join(", ") },
              { label: d.next.youth, render: (r) => (r.has_arg_youth_cap ? d.common.yes : DASH) },
              { label: d.next.trajectory, align: "r", render: (r) => fmtDec(locale, r.trajectory) },
              { label: d.next.cols.minutesNow, align: "r", render: (r) => fmtInt(locale, r.minutes_this_season) },
            ]}
          />
        )}
        <Note>{d.next.retentionNote}</Note>
      </Section>

      <Section title={d.next.breakthroughs}>
        {breakthroughs.length === 0 ? (
          <p className="text-sm text-muted">{DASH}</p>
        ) : (
          <ol className="max-w-4xl">
            {breakthroughs.map((m) => (
              <MoverLine key={m.event_key} m={m} locale={locale} ctx={ctx} />
            ))}
          </ol>
        )}
        <Note>{d.next.breakthroughsNote}</Note>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title={d.next.youth}>
          <p className="text-sm leading-relaxed text-ink-2">
            {youthCapped.map((r, i) => (
              <span key={r.player_key}>
                {i > 0 && ", "}
                <AppLink className="link" href={routes.player(locale, r.player_key)}>
                  {r.full_name}
                </AppLink>
                <span className="text-muted"> ({r.age})</span>
              </span>
            ))}
          </p>
          <Note>{d.next.youthNote}</Note>
        </Section>
        <Section title={d.next.pipeline}>
          <h3 className="mb-1 text-sm text-muted">{d.next.byDestination}</h3>
          <Bars data={byCountry.map((c) => ({ label: c.to_country, value: c.players_exported }))} width={480} rowHeight={22} />
          <h3 className="mb-1 mt-4 text-sm text-muted">{d.next.byYear}</h3>
          <LineChart points={byYear.map((y) => ({ x: y.transfer_year, y: y.players_exported }))} width={480} height={160} />
          <h3 className="mb-1 mt-4 text-sm text-muted">{d.next.cohortMoves}</h3>
          <ul className="text-sm text-ink-2">
            {cohortMoves.slice(0, 15).map((r) => (
              <li key={r.player_key} className="border-b border-rule py-1">
                <AppLink className="link" href={routes.player(locale, r.player_key)}>
                  {r.full_name}
                </AppLink>{" "}
                · {fmtDate(locale, r.first_abroad_date)} → {r.first_abroad_country}
                {r.first_abroad_competition ? ` (${r.first_abroad_competition})` : ""} · {r.first_abroad_age}
              </li>
            ))}
          </ul>
          <Note>{d.next.pipelineNote}</Note>
        </Section>
      </div>
    </>
  );
}
