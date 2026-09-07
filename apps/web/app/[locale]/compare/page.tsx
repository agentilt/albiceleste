import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTitle } from "@albiceleste/ui";
import { getWindows, manifest } from "@albiceleste/data";
import { CompareTool } from "@/components/CompareTool";
import { t } from "@/lib/i18n";
import { localeParams, readLocale } from "@/lib/params";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  return { title: t(locale).compare.title };
}

export default async function ComparePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const windows = await getWindows();
  return (
    <>
      <PageTitle title={d.compare.title} lede={d.compare.choose} />
      <Suspense>
        <CompareTool locale={locale} windows={windows} horizon={manifest().data_as_of} />
      </Suspense>
    </>
  );
}
