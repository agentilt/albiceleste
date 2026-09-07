"use client";

import { usePathname } from "next/navigation";
import { AppLink } from "@/lib/link";
import { t, type Locale } from "@/lib/i18n";

export default function NotFound() {
  const path = usePathname();
  const locale: Locale = path?.startsWith("/en") ? "en" : "es";
  const d = t(locale);
  return (
    <div className="max-w-xl">
      <h1 className="text-4xl">{d.site.notFound}</h1>
      <p className="mt-3 text-ink-2">{d.site.notFoundLede}</p>
      <p className="mt-4">
        <AppLink className="link" href={`/${locale}`}>
          {d.site.backHome}
        </AppLink>
      </p>
    </div>
  );
}
