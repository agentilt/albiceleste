import type { Locale } from "./i18n";

export const routes = {
  home: (l: Locale) => `/${l}`,
  round: (l: Locale, week?: string) => (week ? `/${l}/round/${week}` : `/${l}/round`),
  pool: (l: Locale, q = "") => `/${l}/pool${q}`,
  player: (l: Locale, key: string) => `/${l}/players/${encodeURIComponent(key)}`,
  movers: (l: Locale, q = "") => `/${l}/movers${q}`,
  compare: (l: Locale, keys: string[] = []) => `/${l}/compare${keys.length ? `?p=${keys.map(encodeURIComponent).join(",")}` : ""}`,
  next: (l: Locale) => `/${l}/next-cycle`,
  board: (l: Locale, q = "") => `/${l}/board${q}`,
  about: (l: Locale, hash = "") => `/${l}/about-data${hash}`,
};

/** Same path under the other locale. */
export function switchLocale(path: string, to: Locale): string {
  const rest = path.replace(/^\/(es|en)(?=\/|$)/, "");
  return `/${to}${rest}`;
}
