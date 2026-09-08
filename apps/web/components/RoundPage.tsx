import { Suspense } from "react";
import { PageTitle, Section } from "@albiceleste/ui";
import { currentWeekStart, getCompetitions, getMoversBetween, getRound, getWeeks, inRoundScope } from "@albiceleste/data";
import { MoverLine } from "@/components/MoverLine";
import { RoundExplorer } from "@/components/RoundExplorer";
import { eventContext } from "@/lib/ctx";
import { fmtDate } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";

/** The round page for one week; shared by /round (current week) and /round/[week]. */
export async function RoundPage({ locale, week }: { locale: Locale; week: string }) {
  const d = t(locale);
  const [weeks, current, rows, competitions, ctx] = await Promise.all([getWeeks(), currentWeekStart(), getRound(week), getCompetitions(), eventContext()]);
  const idx = weeks.findIndex((w) => w.week_start === week);
  const w = weeks[idx];
  if (!w) return null;
  const prev = weeks[idx - 1];
  const next = weeks[idx + 1];
  const isCurrent = week === current;
  const standouts = await getMoversBetween(w.week_start, w.week_end, 8);
  const scoped = rows.filter(inRoundScope);
  return (
    <>
      <PageTitle title={d.round.title} lede={d.round.lede} />
      <div className="mb-6 flex flex-wrap items-baseline gap-4 text-sm">
        <span className="font-mono text-base">
          {d.round.week(fmtDate(locale, w.week_start, false), fmtDate(locale, w.week_end))}
          {isCurrent && <span className="text-muted"> · {d.round.current}</span>}
        </span>
        {prev && (
          <AppLink className="link" href={routes.round(locale, prev.week_start)}>
            {d.round.prev}
          </AppLink>
        )}
        {next && (
          <AppLink className="link" href={next.week_start === current ? routes.round(locale) : routes.round(locale, next.week_start)}>
            {d.round.next}
          </AppLink>
        )}
        <span className="ml-auto text-xs text-muted">{weeks.length} · {fmtDate(locale, weeks[0]!.week_start, false)} → {fmtDate(locale, current)}</span>
      </div>

      {standouts.length > 0 && (
        <Section title={d.round.standouts}>
          <ol className="max-w-4xl">
            {standouts.map((m) => (
              <MoverLine key={m.event_key} m={m} locale={locale} ctx={ctx} />
            ))}
          </ol>
        </Section>
      )}

      <Suspense>
        <RoundExplorer rows={scoped} week={week} current={isCurrent} competitions={competitions} locale={locale} />
      </Suspense>
    </>
  );
}
