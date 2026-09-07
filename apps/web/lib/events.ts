/**
 * Event facts rendered from evidence in the reader's language. The player's name is not part of the sentence: the caller
 * links it separately. Anything the evidence lacks is left out rather than guessed.
 */
import type { Locale } from "./i18n";
import { t } from "./i18n";
import { fmtDate } from "./fmt";

export interface EventContext {
  /** league code -> competition name */
  leagues: Record<string, string>;
  /** window id -> labels */
  windows: Record<string, { label_es: string; label_en: string }>;
  posPlural?: Record<string, string>;
}

type Ev = Record<string, string | number | boolean | null>;

function parse(evidence: string | null | undefined): Ev {
  if (!evidence) return {};
  try {
    return JSON.parse(evidence) as Ev;
  } catch {
    return {};
  }
}

function n(v: unknown): number {
  return typeof v === "number" ? v : Number(v ?? 0);
}

export function renderEvent(locale: Locale, type: string, evidence: string | null | undefined, ctx: EventContext): string {
  const e = parse(evidence);
  const d = t(locale);
  const comp = (code: unknown) => (typeof code === "string" ? (ctx.leagues[code] ?? code) : "");
  const es = locale === "es";
  switch (type) {
    case "club_change": {
      const stronger = n(e.to_level_rank) < n(e.from_level_rank);
      const weaker = n(e.to_level_rank) > n(e.from_level_rank);
      const verdict = stronger ? (es ? "liga más fuerte" : "stronger league") : weaker ? (es ? "liga más débil" : "weaker league") : es ? "mismo nivel" : "same level";
      return es
        ? `primer partido con ${e.to_team ?? "?"} (${comp(e.to_league)}) tras ${e.from_team ?? "?"} (${comp(e.from_league)}) · ${verdict}`
        : `first match for ${e.to_team ?? "?"} (${comp(e.to_league)}) after ${e.from_team ?? "?"} (${comp(e.from_league)}) · ${verdict}`;
    }
    case "first_start_of_season":
      return es ? `primera titularidad de la temporada ${e.season_year ?? ""}` : `first start of the ${e.season_year ?? ""} season`;
    case "consecutive_starts":
      return es ? `${e.consecutive_starts} titularidades seguidas` : `${e.consecutive_starts} consecutive starts`;
    case "scoring_streak":
      return es ? `gol en ${e.consecutive_scoring_apps} partidos seguidos` : `scored in ${e.consecutive_scoring_apps} consecutive appearances`;
    case "multi_goal_match": {
      const g = n(e.goals);
      if (g >= 3) return es ? `hat-trick (${g} goles en ${e.minutes ?? "?"}′)` : `hat-trick (${g} goals in ${e.minutes ?? "?"}′)`;
      return es ? `${g} goles en un partido (${e.minutes ?? "?"}′)` : `${g} goals in one match (${e.minutes ?? "?"}′)`;
    }
    case "return_after_absence":
      return es
        ? `volvió a jugar tras ${e.days_absent} días y ${e.team_matches_missed} partidos del equipo sin jugar`
        : `played again after ${e.days_absent} days and ${e.team_matches_missed} team matches missed`;
    case "debut_in_league": {
      const role = e.started ? (es ? "titular" : "started") : es ? `${e.minutes ?? "?"}′ desde el banco` : `${e.minutes ?? "?"}′ off the bench`;
      return es ? `primer partido en ${comp(e.league) || (es ? "la liga" : "the league")} en nuestros datos · ${role}` : `first appearance in ${comp(e.league) || "the league"} in our data · ${role}`;
    }
    case "minutes_surge":
    case "minutes_drop": {
      const pct = n(e.change_pct);
      const sign = pct > 0 ? "+" : "";
      return es
        ? `${e.minutes}′ en 28 días contra ${e.prev_minutes}′ en los 28 anteriores (${sign}${Math.round(pct)}%) · ${e.starts} titularidades contra ${e.prev_starts}`
        : `${e.minutes}′ in 28 days against ${e.prev_minutes}′ in the 28 before (${sign}${Math.round(pct)}%) · ${e.starts} starts against ${e.prev_starts}`;
    }
    case "rank_move": {
      const pos = (ctx.posPlural ?? (d.pos as Record<string, string>))[String(e.pos_group)] ?? String(e.pos_group);
      const basis = e.basis === "window" ? (es ? "desde la última lista" : "since the last list") : es ? "en 28 días" : "over 28 days";
      const up = n(e.change) > 0;
      return es
        ? `${up ? "subió" : "bajó"} del ${e.from_rank} al ${e.to_rank} entre los ${pos.toLowerCase()} ${basis}`
        : `${up ? "up" : "down"} from ${e.from_rank} to ${e.to_rank} among ${pos.toLowerCase()} ${basis}`;
    }
    case "selection_called": {
      const w = ctx.windows[String(e.window_id)];
      const label = w ? (es ? w.label_es : w.label_en) : String(e.window ?? "");
      const status = e.status && e.status !== "called" ? ` (${e.status})` : "";
      return es ? `convocado para ${label}${status}` : `called up for the ${label}${status}`;
    }
    case "selection_left_out": {
      const w = ctx.windows[String(e.window_id)];
      const label = w ? (es ? w.label_es : w.label_en) : String(e.window ?? "");
      return es ? `quedó afuera de la lista para ${label}` : `left out of the ${label} list`;
    }
    default:
      return type.replace(/_/g, " ");
  }
}

/** Short kind label for filters and marks. */
export function eventKind(locale: Locale, type: string): string {
  const k = t(locale).movers.kinds as Record<string, string>;
  return k[type] ?? type.replace(/_/g, " ");
}

export function eventDateLabel(locale: Locale, date: string): string {
  return fmtDate(locale, date, false);
}
