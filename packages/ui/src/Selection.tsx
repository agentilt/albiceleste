export interface CallMark {
  id: string;
  label: string;
  /** null: not in the list; undefined: list not published yet */
  status?: "called" | "started" | "unused" | "withdrew" | null;
}

/** One mark per window: filled when called, hollow when not, dotted when the list is still to come. */
export function CallStrip({ marks, size = "md" }: { marks: CallMark[]; size?: "sm" | "md" }) {
  const box = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1" role="list">
      {marks.map((m) => {
        const pending = m.status === undefined;
        const called = !!m.status && m.status !== "withdrew";
        const cls = pending ? "border border-dashed border-rule-strong" : called ? "bg-celeste-deep" : m.status === "withdrew" ? "border border-celeste-deep" : "border border-rule-strong";
        return <span key={m.id} role="listitem" title={`${m.label}${m.status ? `: ${m.status}` : pending ? "" : ": –"}`} className={`inline-block ${box} rounded-xs ${cls}`} />;
      })}
    </span>
  );
}
