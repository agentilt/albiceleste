/**
 * A small "?" that carries an explanation on hover, focus or touch, so pages stay clean and the method stays reachable.
 * With `href` it also links to the long version (Sobre los datos).
 */
export function Hint({ text, href, align = "left" }: { text: string; href?: string; /** hang the tooltip from the right edge when the "?" sits near the viewport's right */ align?: "left" | "right" }) {
  const cls = `hit tip ${align === "right" ? "tip-right" : ""} inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-rule-strong font-mono text-[11px] font-medium normal-case leading-none tracking-normal text-muted hover:border-celeste-deep hover:text-celeste-deep focus-visible:border-celeste-deep`;
  return href ? (
    <a href={href} data-tip={text} aria-label={text} className={cls}>
      ?
    </a>
  ) : (
    <button type="button" data-tip={text} aria-label={text} className={cls}>
      ?
    </button>
  );
}
