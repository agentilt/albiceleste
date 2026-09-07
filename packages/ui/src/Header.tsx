import type { ReactNode } from "react";
import { DefaultLink, type LinkLike } from "./link";

export interface NavItem {
  href: string;
  label: string;
}

/** Site wordmark, set in the serif display face. */
export function Wordmark({ href = "/", LinkComponent = DefaultLink, text = "albiceleste" }: { href?: string; LinkComponent?: LinkLike; text?: string }) {
  return (
    <LinkComponent href={href} className="font-serif text-2xl tracking-tight">
      {text}
    </LinkComponent>
  );
}

/** Primary navigation: text links with an ink underline on the current section. */
export function Nav({ items, current, LinkComponent = DefaultLink }: { items: NavItem[]; current: string; LinkComponent?: LinkLike }) {
  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {items.map((it) => {
        const active = current === it.href || current.startsWith(`${it.href}/`);
        return (
          <LinkComponent
            key={it.href}
            href={it.href}
            className={active ? "border-b-2 border-ink pb-0.5 text-ink" : "border-b-2 border-transparent pb-0.5 text-ink-2 hover:text-ink"}
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
 * Page header: wordmark, navigation, an optional right-hand slot (search), and the data-horizon line beneath.
 * Wrap the whole page in a max-width container the same way the site does (see `Page`).
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
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3">
        <Wordmark href={homeHref} LinkComponent={LinkComponent} />
        <Nav items={nav} current={current} LinkComponent={LinkComponent} />
        {right && <div className="ml-auto">{right}</div>}
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
  return <main className="mx-auto max-w-6xl px-5 py-8">{children}</main>;
}
