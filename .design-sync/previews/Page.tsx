import { Note, Page, PageTitle, Section } from "@albiceleste/ui";

export const SectionPage = () => (
  <Page>
    <PageTitle title="Focus set" lede="Everyone abroad is in by default. Argentine-league players enter through explicit rules; each row shows why." />
    <Section title="Rules">
      <p className="text-sm text-ink-2">U23 regular, senior cap, top minutes in position, rising starter.</p>
      <Note>Rising starter = 3 or more starts in the last 5 team matches after at most 1 in the previous 5.</Note>
    </Section>
  </Page>
);
