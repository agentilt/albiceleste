import { Header, SearchInput } from "@albiceleste/ui";

const NAV = [
  { href: "/feed", label: "Watch feed" },
  { href: "/abroad", label: "Abroad" },
  { href: "/focus", label: "Focus set" },
  { href: "/exports", label: "Presence & exports" },
  { href: "/quality", label: "Data quality" },
  { href: "/about", label: "About" },
];

export const SiteHeader = () => (
  <Header
    nav={NAV}
    current="/abroad"
    meta="Matches through 5 Sep 2026 · squads as of 5 Sep 2026 · snapshot 6 Sep 2026 09:25 UTC · 12eac3f"
    right={<SearchInput value="" onChange={() => {}} hits={[]} onSelect={() => {}} />}
  />
);

export const WithoutSearchOrMeta = () => <Header nav={NAV} current="/" />;
