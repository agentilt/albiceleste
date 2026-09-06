import type { Metadata } from "next";
import { getExportingClubs, getExportsByCountry, getExportsByYear, getPresence } from "@albiceleste/data";
import { Bars, LineChart } from "@/components/charts";
import { StaticTable } from "@/components/StaticTable";
import { Note, PageTitle, Section } from "@/components/ui";
import { dec1, eur, int } from "@/lib/format";

export const metadata: Metadata = { title: "Presence and exports" };

const YEAR_FROM = 2016;

export default async function ExportsPage() {
  const [presence, byCountry, byYear, clubs] = await Promise.all([getPresence(), getExportsByCountry(YEAR_FROM), getExportsByYear(YEAR_FROM), getExportingClubs()]);
  return (
    <>
      <PageTitle title="Presence and the export pipeline" lede="Where eligible players are today, and where Argentine clubs have been sending them." />

      <Section title="Where eligible players are today" aside="current squads">
        <StaticTable
          rows={presence}
          rowKey={(r) => r.league}
          cols={[
            { label: "Competition", render: (r) => r.competition },
            { label: "Country", render: (r) => r.country },
            { label: "Players", align: "r", render: (r) => int(r.players) },
            { label: "Under 23", align: "r", render: (r) => int(r.players_u23) },
            { label: "Senior internationals", align: "r", render: (r) => int(r.senior_internationals) },
            { label: "Under review", align: "r", render: (r) => int(r.under_review) },
            { label: "Clubs with Argentines", align: "r", render: (r) => int(r.clubs_with_argentines) },
          ]}
        />
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title={`First move abroad, destinations since ${YEAR_FROM}`} aside="every Argentine in the Transfermarkt snapshot">
          <Bars data={byCountry.map((d) => ({ label: d.to_country, value: d.players_exported }))} />
        </Section>
        <Section title="Players exported per year">
          <LineChart points={byYear.map((d) => ({ x: d.transfer_year, y: d.players_exported }))} />
          <Note>Average age at export, {YEAR_FROM} onward: {dec1(byYear.reduce((s, d) => s + (d.avg_age ?? 0), 0) / Math.max(1, byYear.filter((d) => d.avg_age !== null).length))}.</Note>
        </Section>
      </div>

      <Section title="Exporting clubs">
        <StaticTable
          rows={clubs}
          rowKey={(r) => r.club}
          cols={[
            { label: "Club", render: (r) => r.club },
            { label: "Players exported", align: "r", render: (r) => int(r.players_exported) },
            { label: "Last 10 years", align: "r", render: (r) => int(r.exported_last_10y) },
            { label: "To Europe", align: "r", render: (r) => int(r.to_europe) },
            { label: "Avg age", align: "r", render: (r) => dec1(r.avg_age_at_export) },
            { label: "Total fees", align: "r", render: (r) => eur(r.total_fees_eur) },
          ]}
        />
        <Note>&ldquo;other / not covered&rdquo; means the destination league is outside the 65 competitions in the snapshot.</Note>
      </Section>
    </>
  );
}
