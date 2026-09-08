import type { Metadata } from "next";
import { Suspense } from "react";
import { Bars, LineChart, PageTitle, Panel, Section } from "@albiceleste/ui";
import { getAgeBands, getCompetitions, getExportsByCountry, getExportsByYear, getMovers, getTrajectory, getYouthEvents, manifest } from "@albiceleste/data";
import { CohortExplorer, CohortScatter } from "@/components/Cohort";
import { MoreRows } from "@/components/MoreRows";
import { MoverWho, moverFact } from "@/components/MoverLine";
import { eventContext } from "@/lib/ctx";
import { DASH, fmtDate, fmtDec, fmtInt } from "@/lib/fmt";
import { countryName } from "@/lib/geo";
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

function pretty(id: string | null): string {
  if (!id) return "";
  return id
    .replace(/-/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
    .replace(/\bUefa\b/, "UEFA")
    .replace(/\bMx\b/, "MX");
}

export default async function NextCyclePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const tag = locale === "es" ? "es-AR" : "en-GB";
  const horizon = manifest().data_as_of;
  const [rows, band, youth, movers, byCountry, byYear, ctx, competitions] = await Promise.all([
    getTrajectory(),
    getAgeBands(),
    getYouthEvents(),
    getMovers(),
    getExportsByCountry(2015, 12),
    getExportsByYear(2015),
    eventContext(),
    getCompetitions(),
  ]);
  const keys = new Set(rows.map((r) => r.player_key));
  const breakthroughs = movers.filter((m) => keys.has(m.player_key) && BREAKTHROUGH_KINDS.has(m.event_type)).slice(0, 40);
  const retention = rows.filter((r) => r.dual_national_untied).sort((a, b) => (b.trajectory ?? 0) - (a.trajectory ?? 0));
  const youthCapped = rows.filter((r) => r.has_arg_youth_cap).sort((a, b) => (b.trajectory ?? 0) - (a.trajectory ?? 0));
  const cohortMoves = rows.filter((r) => r.first_abroad_date).sort((a, b) => b.first_abroad_date!.localeCompare(a.first_abroad_date!));
  const exits = byCountry.reduce((s, c) => s + c.players_exported, 0);

  const who = (r: { player_key: string; full_name: string; team: string | null }) => (
    <span className="inline-flex max-w-full items-baseline gap-2 whitespace-nowrap">
      <AppLink className="link shrink-0 font-medium" href={routes.player(locale, r.player_key)}>
        {r.full_name}
      </AppLink>
      {r.team && <span className="min-w-0 truncate text-muted">{r.team}</span>}
    </span>
  );

  return (
    <>
      <PageTitle title={d.next.title} hint={d.next.lede} hintHref={routes.about(locale, "#trajectory")} aside={d.next.cohort(rows.length, fmtDate(locale, horizon))} />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <div id="retention" className="flex min-w-0">
          <Panel title={d.next.retention} hint={d.next.retentionNote} aside={<span className="num font-mono text-xs">{retention.length}</span>} className="flex-1">
            {retention.length === 0 ? (
              <p className="py-2 text-sm text-muted">{d.next.retentionNone}</p>
            ) : (
              <MoreRows
                locale={locale}
                limit={8}
                rows={retention.map((r) => ({
                  key: r.player_key,
                  left: who(r),
                  right: `${(r.citizenships ?? [])
                    .filter((c) => c !== "Argentina")
                    .map((c) => countryName(locale, c))
                    .join(" · ")} · ${fmtDec(locale, r.trajectory)}`,
                }))}
              />
            )}
          </Panel>
        </div>
        <Panel title={d.next.youth} hint={d.next.youthNote} aside={<span className="num font-mono text-xs">{youthCapped.length}</span>}>
          <MoreRows
            locale={locale}
            limit={8}
            rows={youthCapped.map((r) => ({
              key: r.player_key,
              left: who(r),
              right: `${(d.posShort as Record<string, string>)[r.pos_group ?? "UNK"]} · ${r.age ?? DASH} · ${fmtDec(locale, r.trajectory)}`,
            }))}
          />
        </Panel>
        <Panel title={d.next.calendar} aside={<span className="num font-mono text-xs">{youth.length}</span>}>
          <MoreRows
            locale={locale}
            limit={8}
            rows={youth.map((y) => ({
              key: y.event_id,
              left: locale === "es" ? y.label_es : y.label_en,
              right: `${fmtDate(locale, y.starts, false)} – ${fmtDate(locale, y.ends, false)}${y.status === "expected" ? ` · ${d.common.expected}` : ""}`,
            }))}
          />
        </Panel>
      </div>

      <Section title={d.next.curve} hint={d.next.curveNote} hintHref={routes.about(locale, "#trajectory")}>
        <CohortScatter rows={rows} band={band} locale={locale} />
      </Section>

      <Section title={d.next.list} hint={d.next.trajectoryNote} hintHref={routes.about(locale, "#trajectory")}>
        <Suspense>
          <CohortExplorer rows={rows} competitions={competitions} locale={locale} />
        </Suspense>
      </Section>

      <div className="mb-6 grid gap-4 lg:grid-cols-2">
        <Panel title={d.next.breakthroughs} hint={d.next.breakthroughsNote} aside={<span className="num font-mono text-xs">{breakthroughs.length}</span>}>
          {breakthroughs.length === 0 ? (
            <p className="py-2 text-sm text-muted">{DASH}</p>
          ) : (
            <MoreRows locale={locale} limit={12} rows={breakthroughs.map((m) => ({ key: m.event_key, left: <MoverWho m={m} locale={locale} />, right: moverFact(m, locale, ctx) }))} />
          )}
        </Panel>
        <Panel title={d.next.pipeline} hint={d.next.pipelineNote} aside={<span className="num font-mono text-xs">{`${fmtInt(locale, exits)} ${d.next.exits}`}</span>}>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div>
              <h3 className="mb-1 font-mono text-[11px] font-medium uppercase tracking-wide text-muted">{d.next.byDestination}</h3>
              <Bars data={byCountry.map((c) => ({ label: countryName(locale, c.to_country), value: c.players_exported }))} width={300} rowHeight={20} label={d.next.byDestination} empty={DASH} />
            </div>
            <div>
              <h3 className="mb-1 font-mono text-[11px] font-medium uppercase tracking-wide text-muted">{d.next.byYear}</h3>
              <LineChart points={byYear.map((y) => ({ x: y.transfer_year, y: y.players_exported }))} width={300} height={170} label={d.next.byYear} yLabel={d.next.byYear} locale={tag} empty={DASH} />
            </div>
          </div>
          <h3 className="mb-1 font-mono text-[11px] font-medium uppercase tracking-wide text-muted">{d.next.cohortMoves}</h3>
          <MoreRows
            locale={locale}
            limit={6}
            rows={cohortMoves.map((r) => ({
              key: r.player_key,
              left: who(r),
              right: `${fmtDate(locale, r.first_abroad_date, false)} → ${countryName(locale, r.first_abroad_country)}${r.first_abroad_competition ? ` · ${pretty(r.first_abroad_competition)}` : ""} · ${r.first_abroad_age ?? DASH}`,
            }))}
          />
        </Panel>
      </div>
    </>
  );
}
