const nf0 = new Intl.NumberFormat("en-GB", { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const DASH = "–";

export function int(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? DASH : nf0.format(v);
}

export function dec1(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? DASH : nf1.format(v);
}

export function dec2(v: number | null | undefined): string {
  return v === null || v === undefined || Number.isNaN(v) ? DASH : nf2.format(v);
}

export function pct(v: number | null | undefined, signed = false): string {
  if (v === null || v === undefined || Number.isNaN(v)) return DASH;
  const s = nf0.format(Math.abs(v));
  const sign = signed ? (v > 0 ? "+" : v < 0 ? "−" : "") : v < 0 ? "−" : "";
  return `${sign}${s}%`;
}

export function eur(v: number | null | undefined): string {
  if (v === null || v === undefined || Number.isNaN(v)) return DASH;
  if (v >= 1e6) return `€${nf1.format(v / 1e6)}m`;
  if (v >= 1e3) return `€${nf0.format(v / 1e3)}k`;
  return `€${nf0.format(v)}`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** 'YYYY-MM-DD' or ISO timestamp -> '5 Sep 2026' */
export function date(v: string | null | undefined, withYear = true): string {
  if (!v) return DASH;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (!m) return v;
  const d = `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]}`;
  return withYear ? `${d} ${m[1]}` : d;
}

export function datetime(v: string | null | undefined): string {
  if (!v) return DASH;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return `${date(d.toISOString())} ${d.toISOString().slice(11, 16)} UTC`;
}

export function label(s: string): string {
  return s.replace(/_/g, " ");
}

export function playerHref(key: string): `/players/${string}` {
  return `/players/${encodeURIComponent(key)}`;
}
