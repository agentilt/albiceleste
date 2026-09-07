import type { Locale } from "./i18n";

const TZ = "America/Argentina/Buenos_Aires";
export const DASH = "–";

function tag(locale: Locale): string {
  return locale === "es" ? "es-AR" : "en-GB";
}

export function fmtInt(locale: Locale, v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? DASH : new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 0 }).format(v);
}

export function fmtDec(locale: Locale, v: number | null | undefined, digits = 2): string {
  return v === null || v === undefined || Number.isNaN(v) ? DASH : new Intl.NumberFormat(tag(locale), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

export function fmtPct(locale: Locale, v: number | null | undefined, signed = false): string {
  if (v === null || v === undefined || Number.isNaN(v)) return DASH;
  const s = new Intl.NumberFormat(tag(locale), { maximumFractionDigits: 0 }).format(Math.abs(v));
  const sign = v < 0 ? "−" : signed && v > 0 ? "+" : "";
  return `${sign}${s}%`;
}

export function fmtEur(locale: Locale, v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return DASH;
  const nf = (x: number, d: number) => new Intl.NumberFormat(tag(locale), { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);
  if (v >= 1e6) return `€${nf(v / 1e6, 1)} M`;
  if (v >= 1e3) return `€${nf(v / 1e3, 0)} k`;
  return `€${nf(v, 0)}`;
}

/** 'YYYY-MM-DD' or ISO -> '7 sep 2026' / '7 Sep 2026' (calendar date, no time-zone shift). */
export function fmtDate(locale: Locale, v: string | null | undefined, withYear = true): string {
  if (!v) return DASH;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  const s = new Intl.DateTimeFormat(tag(locale), { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC" }).format(d);
  return s.replace(/\.$/, "").replace(/\. /g, " ");
}

/** ISO timestamp -> 'sáb 12 sep, 16:00' in Buenos Aires time. */
export function fmtKickoff(locale: Locale, iso: string | null | undefined, withDay = true): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const day = new Intl.DateTimeFormat(tag(locale), { weekday: "short", day: "numeric", month: "short", timeZone: TZ }).format(d).replace(/\./g, "");
  const time = new Intl.DateTimeFormat(tag(locale), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(d);
  return withDay ? `${day}, ${time}` : time;
}

/** Calendar day in Buenos Aires for grouping fixtures. */
export function baDay(iso: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ }).format(d);
}

export function fmtDayHeading(locale: Locale, ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  return new Intl.DateTimeFormat(tag(locale), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(dt);
}

export function fmtDateTime(locale: Locale, iso: string | null | undefined): string {
  if (!iso) return DASH;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${fmtDate(locale, d.toISOString())} ${d.toISOString().slice(11, 16)} UTC`;
}

export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.slice(0, 10).split("-").map(Number);
  const [by, bm, bd] = b.slice(0, 10).split("-").map(Number);
  return Math.round((Date.UTC(by!, bm! - 1, bd!) - Date.UTC(ay!, am! - 1, ad!)) / 86400000);
}

export function shareToPct(v: number | null | undefined): number | null {
  return v === null || v === undefined ? null : Math.round(v * 100);
}
