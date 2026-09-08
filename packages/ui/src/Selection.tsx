export interface CallMark {
  id: string;
  label: string;
  /** null: not in the list; undefined: list not published yet */
  status?: "called" | "started" | "unused" | "withdrew" | null;
}

/**
 * One mark per window: filled when called, hollow when not, dotted when the list is still to come. The strip is one tab
 * stop; hover or focus shows every window with its outcome. `statusLabels` localises the outcomes.
 */
export function CallStrip({ marks, size = "md", statusLabels = {}, notCalled = "–", pending = "" }: { marks: CallMark[]; size?: "sm" | "md"; statusLabels?: Partial<Record<NonNullable<CallMark["status"]>, string>>; notCalled?: string; pending?: string }) {
  const box = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  const outcome = (m: CallMark) => (m.status === undefined ? pending : m.status === null ? notCalled : (statusLabels[m.status] ?? m.status));
  const tip = marks.map((m) => `${m.label}: ${outcome(m)}`.replace(/: $/, "")).join(" · ");
  return (
    <span className="tip inline-flex items-center gap-1" role="list" tabIndex={0} aria-label={tip} data-tip={tip}>
      {marks.map((m) => {
        const pend = m.status === undefined;
        const called = !!m.status && m.status !== "withdrew";
        const cls = pend ? "border border-dashed border-rule-strong" : called ? "bg-celeste-deep" : m.status === "withdrew" ? "border border-celeste-deep" : "border border-rule-strong";
        return <span key={m.id} role="listitem" title={`${m.label}${outcome(m) ? `: ${outcome(m)}` : ""}`} className={`inline-block ${box} rounded-xs ${cls}`} />;
      })}
    </span>
  );
}
