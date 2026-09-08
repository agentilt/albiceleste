import { StateWord } from "@albiceleste/ui";
import type { MoverRow } from "@albiceleste/data";
import { NoteCount } from "@/components/FollowStar";
import { renderEvent, type EventContext } from "@/lib/events";
import { fmtDate } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { stateLabel, stateTone } from "@/lib/state";

/** One mover: date, player linked, the fact from evidence, club, state word, note mark. Works in server and client trees. */
export function MoverLine({ m, locale, ctx, showDate = true, showClub = true, compact = false }: { m: MoverRow; locale: Locale; ctx: EventContext; showDate?: boolean; showClub?: boolean; compact?: boolean }) {
  const d = t(locale);
  if (compact) {
    return (
      <li className="border-b border-rule py-1 text-xs leading-snug last:border-b-0">
        <AppLink className="link font-medium" href={routes.player(locale, m.player_key)}>
          {m.full_name}
        </AppLink>
        <span className="text-ink-2"> {renderEvent(locale, m.event_type, m.evidence, ctx)}</span>
      </li>
    );
  }
  return (
    <li className="grid grid-cols-[5.5rem_1fr] items-baseline gap-x-3 border-b border-rule py-2 text-sm">
      <span className="font-mono text-xs text-muted">{showDate ? fmtDate(locale, m.event_date, false) : ""}</span>
      <span className="min-w-0">
        <AppLink className="link font-medium" href={routes.player(locale, m.player_key)}>
          {m.full_name}
        </AppLink>
        {showClub && m.team && <span className="text-muted"> ({m.team})</span>}
        <span className="text-ink-2">: {renderEvent(locale, m.event_type, m.evidence, ctx)}</span>
        {m.state && (
          <span className="ml-2">
            <StateWord label={stateLabel(d, m.state)} tone={stateTone(m.state)} />
          </span>
        )}
        <span className="ml-2">
          <NoteCount playerKey={m.player_key} locale={locale} />
        </span>
      </span>
    </li>
  );
}
