import type { Metadata } from "next";
import { Suspense } from "react";
import { PageTitle } from "@albiceleste/ui";
import { getPool } from "@albiceleste/data";
import { Board } from "@/components/Board";
import { eventContext } from "@/lib/ctx";
import { t } from "@/lib/i18n";
import { localeParams, readLocale } from "@/lib/params";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  return { title: t(locale).board.title };
}

export default async function BoardPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const [pool, ctx] = await Promise.all([getPool(), eventContext()]);
  const ranked = pool.filter((p) => p.pos_rank !== null);
  const suggestions = ["GK", "DEF", "MID", "FWD"]
    .flatMap((g) => ranked.filter((p) => p.pos_group === g).slice(0, 1))
    .slice(0, 3)
    .map((p) => ({ key: p.player_key, name: p.full_name }));
  return (
    <>
      <PageTitle title={d.board.title} hint={`${d.board.lede} ${d.board.warning}`} />
      <Suspense>
        <Board locale={locale} ctx={ctx} suggestions={suggestions} />
      </Suspense>
    </>
  );
}
