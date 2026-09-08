"use client";

/** Follow toggle: a star that fills when pressed. Storage is the host's business. The hit area extends beyond the glyph. */
export function FollowButton({ pressed, onClick, labelOn = "Following", labelOff = "Follow", compact = false }: { pressed: boolean; onClick: () => void; labelOn?: string; labelOff?: string; compact?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-label={pressed ? labelOn : labelOff}
      title={pressed ? labelOn : labelOff}
      onClick={onClick}
      className={`hit inline-flex items-center gap-1 leading-none ${compact ? "text-base" : "text-sm"} ${pressed ? "text-celeste-deep" : "text-muted hover:text-ink"}`}
    >
      <span aria-hidden="true">{pressed ? "★" : "☆"}</span>
      {!compact && <span className="text-xs">{pressed ? labelOn : labelOff}</span>}
    </button>
  );
}

/** Note count mark: pencil glyph and the number, muted; hidden when zero. */
export function NoteMark({ count, title }: { count: number; title?: string }) {
  if (!count) return null;
  return (
    <span className="font-mono text-[11px] text-muted" title={title}>
      ✎ {count}
    </span>
  );
}
