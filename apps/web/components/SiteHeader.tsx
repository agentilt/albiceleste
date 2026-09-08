"use client";

import { Header, type NavItem } from "@albiceleste/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes, switchLocale } from "@/lib/routes";

export function navItems(locale: Locale): NavItem[] {
  const d = t(locale);
  return [
    { href: routes.round(locale), label: d.nav.round },
    { href: routes.pool(locale), label: d.nav.pool },
    { href: routes.movers(locale), label: d.nav.movers },
    { href: routes.compare(locale), label: d.nav.compare },
    { href: routes.next(locale), label: d.nav.next },
    { href: routes.board(locale), label: d.nav.board },
  ];
}

export function SiteHeader({ locale, meta, right }: { locale: Locale; meta: ReactNode | null; right: ReactNode }) {
  const path = usePathname() ?? `/${locale}`;
  const other: Locale = locale === "es" ? "en" : "es";
  const d = t(locale);
  return (
    <Header
      nav={navItems(locale)}
      current={path}
      meta={meta ?? undefined}
      homeHref={routes.home(locale)}
      LinkComponent={AppLink}
      right={
        <div className="flex items-center gap-4">
          {right}
          <AppLink href={switchLocale(path, other)} className="font-mono text-xs uppercase tracking-wide text-muted hover:text-ink">
            {d.site.language}
          </AppLink>
        </div>
      }
    />
  );
}
