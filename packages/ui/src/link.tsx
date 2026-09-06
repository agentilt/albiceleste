import type { ComponentType, ReactNode } from "react";

/** Minimal link contract so the site can plug in its router's Link while previews use a plain anchor. */
export interface LinkProps {
  href: string;
  className?: string;
  children: ReactNode;
}

export type LinkLike = ComponentType<LinkProps>;

export function DefaultLink({ href, className, children }: LinkProps) {
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}
