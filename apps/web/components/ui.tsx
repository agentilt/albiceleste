import type { ReactNode } from "react";

export function PageTitle({ title, lede }: { title: string; lede?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl">{title}</h1>
      {lede && <p className="mt-2 max-w-3xl text-ink-2">{lede}</p>}
    </div>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-rule-strong pb-1">
        <h2 className="text-xl">{title}</h2>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="num font-serif text-3xl">{value}</div>
    </div>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted">{children}</p>;
}

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

export function Severity({ level }: { level: number }) {
  const cls = level >= 3 ? "bg-ink" : level === 2 ? "bg-celeste-deep" : "bg-rule-strong";
  return <span className={`inline-block h-2 w-2 rounded-full ${cls}`} title={`severity ${level}`} aria-label={`severity ${level}`} />;
}
