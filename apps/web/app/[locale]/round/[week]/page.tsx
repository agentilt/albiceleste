import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getWeeks } from "@albiceleste/data";
import { RoundPage } from "@/components/RoundPage";
import { fmtDate } from "@/lib/fmt";
import { t } from "@/lib/i18n";
import { readLocale } from "@/lib/params";

export const dynamicParams = false;

export async function generateStaticParams() {
  const weeks = await getWeeks();
  return weeks.map((w) => ({ week: w.week_start }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; week: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  const { week } = await params;
  return { title: `${t(locale).round.title} · ${fmtDate(locale, week)}` };
}

export default async function WeekRound({ params }: { params: Promise<{ locale: string; week: string }> }) {
  const locale = await readLocale(params);
  const { week } = await params;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) notFound();
  const page = await RoundPage({ locale, week });
  if (!page) notFound();
  return page;
}
