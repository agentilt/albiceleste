import { Note, Section } from "@albiceleste/ui";

export const WithAside = () => (
  <Section title="Biggest movers, last 28 days" aside="players abroad · vs the previous 28 days">
    <p className="text-sm text-ink-2">
      José Manuel López (Palmeiras) went from 45 to 302 minutes; Kevin Lomónaco (Elche) from 117 to 360. Lucas Esquivel and Juan Freytes dropped to zero.
    </p>
    <Note>Share of team minutes is capped at 100%.</Note>
  </Section>
);

export const WithLinkAside = () => (
  <Section
    title="Latest on the watch feed"
    aside={
      <a className="link" href="/feed">
        Full feed →
      </a>
    }
  >
    <p className="text-sm text-ink-2">Twelve most recent events for players abroad and the focus set.</p>
  </Section>
);

export const Plain = () => (
  <Section title="Sources">
    <p className="text-sm text-ink-2">Wikidata, ESPN, Highlightly, football-data.org, Fantasy Premier League, Transfermarkt (CC0 snapshot).</p>
  </Section>
);
