"use client";

import { useEffect, useState } from "react";
import { PlayerSearch } from "@/components/PlayerSearch";
import { SiteHeader } from "@/components/SiteHeader";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";

/** Header plus the not-found message; the locale comes from the path so /en/... answers in English. */
export function NotFoundBody() {
  // prerendered once in Spanish; the English edition switches after mount, from the path
  const [locale, setLocale] = useState<Locale>("es");
  useEffect(() => {
    if (window.location.pathname.startsWith("/en")) setLocale("en");
  }, []);
  const d = t(locale);
  return (
    <>
      <SiteHeader locale={locale} right={<PlayerSearch locale={locale} />} meta={null} />
      <main className="mx-auto max-w-6xl px-5 py-10">
        <p className="mb-2 font-mono text-xs uppercase tracking-wide text-celeste-deep">404</p>
        <h1 className="text-4xl">{d.site.notFound}</h1>
        <p className="mt-3 max-w-xl text-ink-2">{d.site.notFoundLede}</p>
        <p className="mt-4">
          <AppLink className="link" href={routes.home(locale)}>
            {d.site.backHome} →
          </AppLink>
        </p>
      </main>
    </>
  );
}
