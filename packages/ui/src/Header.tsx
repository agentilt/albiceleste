import type { ReactNode } from "react";
import { DefaultLink, type LinkLike } from "./link";

export interface NavItem {
  href: string;
  label: string;
}

/** Site wordmark: the stripe and the name, display face, uppercase. */
export function Wordmark({ href = "/", LinkComponent = DefaultLink, text = "albiceleste" }: { href?: string; LinkComponent?: LinkLike; text?: string }) {
  return (
    <LinkComponent href={href} className="inline-flex items-center gap-2 py-1 font-display text-xl font-black uppercase tracking-tight">
      <span className="stripe" aria-hidden="true" />
      {text}
    </LinkComponent>
  );
}

/**
 * Primary navigation: text links with an ink underline on the current section. On a phone it is one row that scrolls
 * sideways (a shadow marks the hidden end); from `sm` up it wraps like text.
 */
export function Nav({ items, current, LinkComponent = DefaultLink }: { items: NavItem[]; current: string; LinkComponent?: LinkLike }) {
  return (
    <nav className="scroll-x no-bar flex gap-x-5 whitespace-nowrap text-sm sm:flex-wrap sm:gap-y-1">
      {items.map((it) => {
        const active = current === it.href || current.startsWith(`${it.href}/`);
        return (
          <LinkComponent
            key={it.href}
            href={it.href}
            className={`inline-flex items-center border-b-2 py-2 sm:py-0.5 ${active ? "border-ink text-ink" : "border-transparent text-ink-2 hover:text-ink"}`}
          >
            {it.label}
          </LinkComponent>
        );
      })}
    </nav>
  );
}

/** Data-horizon strip: the one line that tells the reader how fresh the numbers are. Monospace, muted. */
export function MetaLine({ children }: { children: ReactNode }) {
  return <div className="font-mono text-xs text-muted">{children}</div>;
}

/**
 * Page header: wordmark, navigation, an optional right-hand slot (search, language), and the data-horizon line beneath.
 * Two rows on a phone (wordmark + right slot, then the scrolling nav), one row from `sm` up.
 */
export function Header({
  nav,
  current,
  right,
  meta,
  homeHref = "/",
  LinkComponent = DefaultLink,
}: {
  nav: NavItem[];
  current: string;
  right?: ReactNode;
  meta?: ReactNode;
  /** where the wordmark links (the locale's home) */
  homeHref?: string;
  LinkComponent?: LinkLike;
}) {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-0 px-5 py-1.5 sm:gap-x-8 sm:gap-y-2 sm:py-3">
        <Wordmark href={homeHref} LinkComponent={LinkComponent} />
        {right && <div className="order-2 ml-auto flex min-w-0 items-center sm:order-3">{right}</div>}
        <div className="order-3 w-full min-w-0 sm:order-2 sm:w-auto">
          <Nav items={nav} current={current} LinkComponent={LinkComponent} />
        </div>
      </div>
      {meta && (
        <div className="mx-auto max-w-6xl px-5 pb-2">
          <MetaLine>{meta}</MetaLine>
        </div>
      )}
    </header>
  );
}

/** Page footer: attribution line in small muted text. */
export function Footer({ children }: { children: ReactNode }) {
  return <footer className="mx-auto max-w-6xl border-t border-rule px-5 py-6 text-xs text-muted">{children}</footer>;
}

/** Main content container matching the header width. */
export function Page({ children }: { children: ReactNode }) {
  return <main className="mx-auto max-w-6xl px-5 py-6">{children}</main>;
}
