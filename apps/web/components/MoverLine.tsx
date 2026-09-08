import { RankArrow, Tag } from "@albiceleste/ui";
import type { MoverRow } from "@albiceleste/data";
import { renderEvent, type EventContext } from "@/lib/events";
import { fmtDate } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";

/** Rank change carried by a rank-move event (positive = up); null for the other kinds. */
export function moverChange(m: MoverRow): number | null {
  if (m.event_type !== "rank_move") return null;
  try {
    const e = JSON.parse(m.evidence) as { from_rank?: number; to_rank?: number; change?: number };
    if (typeof e.change === "number") return e.change;
    if (typeof e.from_rank === "number" && typeof e.to_rank === "number") return e.from_rank - e.to_rank;
  } catch {
    /* evidence is free text */
  }
  return null;
}

/** Name, club and the last-squad mark on one line; the club gives way first. Shared by the movers table and the panels. */
export function MoverWho({ m, locale }: { m: MoverRow; locale: Locale }) {
  const d = t(locale);
  return (
    <span className="inline-flex max-w-full items-baseline gap-2 whitespace-nowrap">
      <AppLink className="link shrink-0 font-medium" href={routes.player(locale, m.player_key)}>
        {m.full_name}
      </AppLink>
      {m.team && <span className="min-w-0 max-w-[9rem] truncate text-muted">{m.team}</span>}
      {m.in_last_squad && (
        <span className="shrink-0">
          <Tag tone="accent">{d.marks.lastSquadShort}</Tag>
        </span>
      )}
    </span>
  );
}

/** Direction of a mover as a mark: the rank delta when there is one, otherwise an arrow by direction. */
export function MoverMark({ m }: { m: MoverRow }) {
  const change = moverChange(m);
  if (change !== null) return <RankArrow change={change} className="text-xs" />;
  return (
    <span className={`num ${m.direction === "up" ? "text-celeste-deep" : m.direction === "down" ? "text-ink-2" : "text-muted"}`}>
      {m.direction === "up" ? "▲" : m.direction === "down" ? "▼" : "·"}
    </span>
  );
}

/** The fact as one sentence from the evidence, for a tooltip or a panel row. */
export function moverFact(m: MoverRow, locale: Locale, ctx: EventContext): string {
  return renderEvent(locale, m.event_type, m.evidence, ctx);
}

/** One mover as a list line: date, who, the fact. Kept for the pages not yet on the table register. */
export function MoverLine({ m, locale, ctx, showDate = true }: { m: MoverRow; locale: Locale; ctx: EventContext; showDate?: boolean; showClub?: boolean; compact?: boolean }) {
  return (
    <li className="flex min-h-9 min-w-0 items-center gap-3 border-b border-rule text-sm">
      {showDate && <span className="w-14 shrink-0 font-mono text-xs text-muted">{fmtDate(locale, m.event_date, false)}</span>}
      <span className="min-w-0 shrink-0">
        <MoverWho m={m} locale={locale} />
      </span>
      <span className="min-w-0 truncate text-ink-2" title={moverFact(m, locale, ctx)}>
        {moverFact(m, locale, ctx)}
      </span>
    </li>
  );
}
