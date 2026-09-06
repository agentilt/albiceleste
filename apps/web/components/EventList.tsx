import Link from "next/link";
import { date, playerHref } from "@/lib/format";
import { EVENT_LABELS, Severity } from "@/components/ui";

export interface EventLike {
  event_key: string;
  event_date: string;
  severity: number;
  event_type: string;
  headline: string;
  full_name?: string;
  player_key?: string;
  focus_reasons?: string[] | null;
}

/** Headline with the player's name turned into a link (the headline always starts with the name). */
function Headline({ e }: { e: EventLike }) {
  if (e.full_name && e.player_key && e.headline.startsWith(e.full_name)) {
    return (
      <>
        <Link className="link font-medium" href={playerHref(e.player_key)}>
          {e.full_name}
        </Link>
        {e.headline.slice(e.full_name.length)}
      </>
    );
  }
  return <>{e.headline}</>;
}

export function EventList({ events, showType = true }: { events: EventLike[]; showType?: boolean }) {
  if (events.length === 0) return <p className="text-sm text-muted">No events.</p>;
  let lastDate = "";
  return (
    <ol className="text-sm">
      {events.map((e) => {
        const showDate = e.event_date !== lastDate;
        lastDate = e.event_date;
        return (
          <li key={e.event_key} className={`grid grid-cols-[6.5rem_0.75rem_1fr] items-baseline gap-x-3 border-b border-rule py-2 ${showDate ? "" : ""}`}>
            <span className="font-mono text-xs text-muted">{showDate ? date(e.event_date, false) : ""}</span>
            <Severity level={e.severity} />
            <span>
              <Headline e={e} />
              {showType && <span className="ml-2 font-mono text-xs text-muted">{EVENT_LABELS[e.event_type] ?? e.event_type}</span>}
              {e.focus_reasons && e.focus_reasons.length > 0 && !e.focus_reasons.includes("abroad") && (
                <span className="ml-2 text-xs text-muted">focus: {e.focus_reasons.join(", ")}</span>
              )}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
