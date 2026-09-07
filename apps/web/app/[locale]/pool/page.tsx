import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTitle } from "@albiceleste/ui";
import { getCompetitions, getPool, getWindows, manifest } from "@albiceleste/data";
import { PoolExplorer } from "@/components/PoolExplorer";
import { t, windowLabel } from "@/lib/i18n";
import { localeParams, readLocale } from "@/lib/params";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  return { title: t(locale).pool.title };
}

export default async function PoolPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const [pool, competitions, windows] = await Promise.all([getPool(), getCompetitions(), getWindows()]);
  const horizon = manifest().data_as_of;
  const last = [...windows].reverse().find((w) => w.announcement_date && w.announcement_date <= horizon && w.listed > 0);
  return (
    <>
      <PageTitle title={d.pool.title} lede={d.pool.lede} />
      <Suspense>
        <PoolExplorer rows={pool} competitions={competitions} locale={locale} horizon={horizon} lastListLabel={last ? windowLabel(locale, last) : null} />
      </Suspense>
    </>
  );
}
