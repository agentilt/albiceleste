import type { ReactNode } from "react";

/**
 * A section that starts folded: the title row reads like a Section (stripe, title, aside) and toggles the body. For the
 * reference blocks a reader opens once in a while (career, transfers, the change log).
 */
export function Disclosure({ title, aside, children, open = false }: { title: string; aside?: ReactNode; children: ReactNode; open?: boolean }) {
  return (
    <details className="disclosure mb-8" open={open}>
      <summary className="flex cursor-pointer items-baseline justify-between gap-4 border-b border-rule-strong pb-1">
        <h2 className="flex items-center gap-2 text-lg">
          <span className="stripe" aria-hidden="true" />
          {title}
          <span className="marker font-mono text-xs text-muted" aria-hidden="true" />
        </h2>
        {aside && <span className="text-xs text-muted">{aside}</span>}
      </summary>
      <div className="pt-3">{children}</div>
    </details>
  );
}
