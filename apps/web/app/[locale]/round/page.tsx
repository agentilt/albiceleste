import type { Metadata } from "next";
import { currentWeekStart } from "@albiceleste/data";
import { RoundPage } from "@/components/RoundPage";
import { t } from "@/lib/i18n";
import { localeParams, readLocale } from "@/lib/params";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  return { title: t(locale).round.title };
}

export default async function CurrentRound({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  return <RoundPage locale={locale} week={await currentWeekStart()} />;
}
