import type { ReactNode } from "react";
import { Hint } from "./Hint";

/** Front-page opener: a large display statement with a one-paragraph lede. */
export function Hero({ title, lede }: { title: ReactNode; lede?: ReactNode }) {
  return (
    <div className="mb-10 max-w-3xl">
      <h1 className="text-5xl leading-tight">{title}</h1>
      {lede && <p className="mt-4 text-lg text-ink-2">{lede}</p>}
    </div>
  );
}

/**
 * Section-page title. Prefer `hint` (a "?" with the explanation on hover, linking to the long version) over `lede`:
 * pages stay quiet and the method stays one gesture away. `aside` is a short mono line on the right (scope, dates, counts).
 */
export function PageTitle({ title, lede, hint, hintHref, aside }: { title: string; lede?: ReactNode; hint?: string; hintHref?: string; aside?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h1 className="flex items-center gap-3 text-4xl">
          {title}
          {hint && <Hint text={hint} href={hintHref} />}
        </h1>
        {lede && <p className="mt-2 max-w-3xl text-ink-2">{lede}</p>}
      </div>
      {aside && <div className="num font-mono text-sm text-muted">{aside}</div>}
    </div>
  );
}

/** A titled block with a hairline rule; `aside` carries a short qualifier or a link on the right; `hint` a "?" after the title. */
export function Section({ title, children, aside, hint, hintHref, id }: { title: string; children: ReactNode; aside?: ReactNode; hint?: string; hintHref?: string; id?: string }) {
  return (
    <section className="mb-10" id={id}>
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-rule-strong pb-1">
        <h2 className="flex items-center gap-2 text-lg">
          <span className="stripe" aria-hidden="true" />
          {title}
          {hint && <Hint text={hint} href={hintHref} />}
        </h2>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** Small muted footnote under a table or chart: method, caveat, source. Use sparingly; prefer a Hint. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted">{children}</p>;
}

/** Headline number: uppercase label over a display figure. Compose several in a grid with a rule above and below. */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="num font-display text-3xl font-black">{value}</div>
    </div>
  );
}

/** Row of Stats with the rules the front page uses. */
export function StatRow({ children }: { children: ReactNode }) {
  return <div className="mb-12 grid grid-cols-2 gap-6 border-y border-rule-strong py-5 sm:grid-cols-3 lg:grid-cols-6">{children}</div>;
}
