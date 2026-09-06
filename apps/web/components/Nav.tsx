"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/feed", label: "Watch feed" },
  { href: "/abroad", label: "Abroad" },
  { href: "/focus", label: "Focus set" },
  { href: "/exports", label: "Presence & exports" },
  { href: "/quality", label: "Data quality" },
  { href: "/about", label: "About" },
] as const;

export function Nav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-x-5 gap-y-1 text-sm">
      {ITEMS.map((it) => {
        const active = path === it.href || path.startsWith(`${it.href}/`);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={active ? "border-b-2 border-ink pb-0.5 text-ink" : "border-b-2 border-transparent pb-0.5 text-ink-2 hover:text-ink"}
          >
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
