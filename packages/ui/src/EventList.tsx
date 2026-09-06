import { date } from "./format";
import { DefaultLink, type LinkLike } from "./link";

export const EVENT_LABELS: Record<string, string> = {
  club_change: "Club change",
  first_start_of_season: "First start of season",
  consecutive_starts: "Consecutive starts",
  scoring_streak: "Scoring streak",
  multi_goal_match: "Multi-goal match",
  return_after_absence: "Return after absence",
  debut_in_league: "League debut",
  minutes_surge: "Minutes surge",
  minutes_drop: "Minutes drop",
};

/** Severity dot: 3 = ink, 2 = celeste, 1 = rule grey. */
export function Severity({ level }: { level: number }) {
  const cls = level >= 3 ? "bg-ink" : level === 2 ? "bg-celeste-deep" : "bg-rule-strong";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} title={`severity ${level}`} aria-label={`severity ${level}`} />;
}

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

function Headline({ e, hrefFor, LinkComponent }: { e: EventLike; hrefFor?: (key: string) => string; LinkComponent: LinkLike }) {
  if (e.full_name && e.player_key && hrefFor && e.headline.startsWith(e.full_name)) {
    return (
      <>
        <LinkComponent className="link font-medium" href={hrefFor(e.player_key)}>
          {e.full_name}
        </LinkComponent>
        {e.headline.slice(e.full_name.length)}
      </>
    );
  }
  return <>{e.headline}</>;
}

/**
 * The watch-feed row: date column (shown once per date), severity dot, headline with the player's name linked,
 * event type in monospace, and the focus reason when the player is not simply abroad.
 */
export function EventList({
  events,
  showType = true,
  hrefFor,
  LinkComponent = DefaultLink,
}: {
  events: EventLike[];
  showType?: boolean;
  hrefFor?: (key: string) => string;
  LinkComponent?: LinkLike;
}) {
  if (events.length === 0) return <p className="text-sm text-muted">No events.</p>;
  let lastDate = "";
  return (
    <ol className="text-sm">
      {events.map((e) => {
        const showDate = e.event_date !== lastDate;
        lastDate = e.event_date;
        return (
          <li key={e.event_key} className="grid grid-cols-[6.5rem_0.75rem_1fr] items-baseline gap-x-3 border-b border-rule py-2">
            <span className="font-mono text-xs text-muted">{showDate ? date(e.event_date, false) : ""}</span>
            <Severity level={e.severity} />
            <span>
              <Headline e={e} hrefFor={hrefFor} LinkComponent={LinkComponent} />
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
