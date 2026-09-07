import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTitle } from "@albiceleste/ui";
import { getCompetitions, getMovers, getWindows, manifest } from "@albiceleste/data";
import { MoversExplorer } from "@/components/MoversExplorer";
import { eventContext } from "@/lib/ctx";
import { t, windowLabel } from "@/lib/i18n";
import { localeParams, readLocale } from "@/lib/params";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  return { title: t(locale).movers.title };
}

export default async function MoversPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const [rows, competitions, windows, ctx] = await Promise.all([getMovers(), getCompetitions(), getWindows(), eventContext()]);
  const horizon = manifest().data_as_of;
  const last = [...windows].reverse().find((w) => w.announcement_date && w.announcement_date <= horizon && w.listed > 0) ?? null;
  return (
    <>
      <PageTitle title={d.movers.title} lede={d.movers.lede} />
      <Suspense>
        <MoversExplorer rows={rows} competitions={competitions} locale={locale} ctx={ctx} horizon={horizon} lastAnnouncement={last?.announcement_date ?? null} lastWindowLabel={last ? windowLabel(locale, last) : null} />
      </Suspense>
    </>
  );
}
