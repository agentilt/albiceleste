import type { Metadata } from "next";
import { Archivo, Chivo, Chivo_Mono } from "next/font/google";
import { Footer, Page } from "@albiceleste/ui";
import { manifest } from "@albiceleste/data";
import { PlayerSearch } from "@/components/PlayerSearch";
import { SiteHeader } from "@/components/SiteHeader";
import { fmtDate, fmtDateTime } from "@/lib/fmt";
import { t } from "@/lib/i18n";
import { localeParams, readLocale } from "@/lib/params";
import { routes } from "@/lib/routes";
import { REPO_URL } from "@/lib/site";
import { AppLink } from "@/lib/link";
import "../globals.css";

const chivo = Chivo({ subsets: ["latin", "latin-ext"], weight: ["400", "700", "900"], variable: "--font-chivo", display: "swap" });
const archivo = Archivo({ subsets: ["latin", "latin-ext"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });
const chivoMono = Chivo_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-chivo-mono", display: "swap" });

export const dynamicParams = false;

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  const d = t(locale);
  return { title: { default: d.site.name, template: `%s · ${d.site.name}` }, description: d.site.description };
}

export default async function LocaleLayout({ children, params }: { children: React.ReactNode; params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const m = manifest();
  return (
    <html lang={locale} className={`${chivo.variable} ${archivo.variable} ${chivoMono.variable}`}>
      <body>
        <SiteHeader
          locale={locale}
          right={<PlayerSearch locale={locale} />}
          meta={
            <>
              {d.site.dataThrough} {fmtDate(locale, m.data_as_of)} · {d.site.squadsAsOf} {fmtDate(locale, m.squad_as_of)} · {d.site.snapshot} {fmtDateTime(locale, m.exported_at)}
              {m.git_commit ? ` · ${m.git_commit}` : ""}
            </>
          }
        />
        <Page>{children}</Page>
        <Footer>
          {d.site.footer}{" "}
          <AppLink className="link" href={routes.about(locale)}>
            {d.site.aboutData}
          </AppLink>
          {" · "}
          <a className="link" href={REPO_URL}>
            {d.site.source}
          </a>
          .
        </Footer>
      </body>
    </html>
  );
}
