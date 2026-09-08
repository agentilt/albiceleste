import type { ReactNode } from "react";

/** Front-page opener: a large display statement with a one-paragraph lede. */
export function Hero({ title, lede }: { title: ReactNode; lede?: ReactNode }) {
  return (
    <div className="mb-10 max-w-3xl">
      <h1 className="text-5xl leading-tight">{title}</h1>
      {lede && <p className="mt-4 text-lg text-ink-2">{lede}</p>}
    </div>
  );
}

/** Section-page title with an optional lede. */
export function PageTitle({ title, lede }: { title: string; lede?: ReactNode }) {
  return (
    <div className="mb-8">
      <h1 className="text-4xl">{title}</h1>
      {lede && <p className="mt-2 max-w-3xl text-ink-2">{lede}</p>}
    </div>
  );
}

/** A titled block with a hairline rule; `aside` carries a short qualifier or a link on the right. */
export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-10">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-rule-strong pb-1">
        <h2 className="flex items-center gap-2 text-lg">
          <span className="stripe" aria-hidden="true" />
          {title}
        </h2>
        {aside && <div className="text-xs text-muted">{aside}</div>}
      </div>
      {children}
    </section>
  );
}

/** Small muted footnote under a table or chart: method, caveat, source. */
export function Note({ children }: { children: ReactNode }) {
  return <p className="mt-2 text-xs text-muted">{children}</p>;
}

/** Headline number: uppercase label over a serif figure. Compose several in a grid with a rule above and below. */
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
