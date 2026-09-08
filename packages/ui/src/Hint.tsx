/** A small "?" that carries an explanation on hover, so pages stay clean and the method stays reachable. */
export function Hint({ text, href }: { text: string; href?: string }) {
  const cls = "inline-flex h-4 w-4 items-center justify-center rounded-full border border-rule-strong font-mono text-[10px] leading-none text-muted hover:border-celeste-deep hover:text-celeste-deep";
  return href ? (
    <a href={href} title={text} aria-label={text} className={cls}>
      ?
    </a>
  ) : (
    <span title={text} aria-label={text} role="img" className={cls}>
      ?
    </span>
  );
}
