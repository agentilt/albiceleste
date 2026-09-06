import type { LinkLike } from "@albiceleste/ui";
import Link from "next/link";
import type { Route } from "next";

/** Next.js Link behind the design system's minimal link contract. */
export const AppLink: LinkLike = ({ href, className, children }) => (
  <Link href={href as Route} className={className}>
    {children}
  </Link>
);
