import { Nav } from "@albiceleste/ui";

const ITEMS = [
  { href: "/feed", label: "Watch feed" },
  { href: "/abroad", label: "Abroad" },
  { href: "/focus", label: "Focus set" },
  { href: "/exports", label: "Presence & exports" },
  { href: "/quality", label: "Data quality" },
  { href: "/about", label: "About" },
];

export const AbroadActive = () => <Nav items={ITEMS} current="/abroad" />;

export const NestedRouteActive = () => <Nav items={ITEMS} current="/feed/2026-09" />;

export const NothingActive = () => <Nav items={ITEMS} current="/" />;
