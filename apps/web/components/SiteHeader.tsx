"use client";

import { Header, type NavItem } from "@albiceleste/ui";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppLink } from "@/lib/link";

export const NAV: NavItem[] = [
  { href: "/feed", label: "Watch feed" },
  { href: "/abroad", label: "Abroad" },
  { href: "/focus", label: "Focus set" },
  { href: "/exports", label: "Presence & exports" },
  { href: "/quality", label: "Data quality" },
  { href: "/about", label: "About" },
];

export function SiteHeader({ meta, right }: { meta: ReactNode; right: ReactNode }) {
  const path = usePathname();
  return <Header nav={NAV} current={path} meta={meta} right={right} LinkComponent={AppLink} />;
}
