import { notFound } from "next/navigation";
import { LOCALES, isLocale, type Locale } from "./i18n";

export function localeParams() {
  return LOCALES.map((locale) => ({ locale }));
}

export async function readLocale(params: Promise<{ locale: string }>): Promise<Locale> {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  return locale;
}
