export { DASH, int, dec1, dec2, pct, eur, date, datetime, label } from "@albiceleste/ui";

export function playerHref(key: string): `/players/${string}` {
  return `/players/${encodeURIComponent(key)}`;
}
