import Link from "next/link";
import { getFeed, getKpis, getMovers, getPresence } from "@albiceleste/data";
import { Bars } from "@/components/charts";
import { EventList } from "@/components/EventList";
import { StaticTable } from "@/components/StaticTable";
import { Note, Section, Stat } from "@/components/ui";
import { int, pct, playerHref } from "@/lib/format";

export default async function Home() {
  const [kpis, presence, feed, movers] = await Promise.all([getKpis(), getPresence(), getFeed(12), getMovers(15)]);
  const abroad = presence.filter((p) => p.country !== "Argentina");
  const home = presence.filter((p) => p.country === "Argentina");

  return (
    <>
      <div className="mb-10 max-w-3xl">
        <h1 className="text-5xl leading-tight">Who could play for Argentina, and what changed this week.</h1>
        <p className="mt-4 text-lg text-ink-2">
          Every player eligible for the senior national team across Europe&apos;s top five leagues, Brazil and Argentina: where they play, how much they
          play, and the changes worth a look. Free data only; every number traces back to a source record.
        </p>
      </div>

      <div className="mb-12 grid grid-cols-2 gap-6 border-y border-rule-strong py-5 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Eligible players known" value={int(kpis.eligible)} />
        <Stat label="In tracked squads" value={int(kpis.in_squads)} />
        <Stat label="Playing abroad" value={int(kpis.abroad)} />
        <Stat label="In focus set" value={int(kpis.in_focus)} />
        <Stat label="Events, last 7 days" value={int(kpis.events_7d)} />
        <Stat label="Matches in data" value={int(kpis.matches)} />
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Where the eligible players abroad are">
          <Bars data={abroad.map((p) => ({ label: p.competition, value: p.players }))} />
          {home.length > 0 && (
            <Note>
              Not shown: {int(home.reduce((s, p) => s + p.players, 0))} eligible players in {home[0]!.competition} squads. The focus set keeps the
              domestic league from flooding the feed.
            </Note>
          )}
        </Section>
        <Section
          title="Latest on the watch feed"
          aside={
            <Link className="link" href="/feed">
              Full feed →
            </Link>
          }
        >
          <EventList events={feed} />
        </Section>
      </div>

      <Section title="Biggest movers, last 28 days" aside="players abroad · vs the previous 28 days">
        <StaticTable
          rows={movers}
          rowKey={(r) => r.player_key}
          cols={[
            {
              label: "Player",
              render: (r) => (
                <Link className="link" href={playerHref(r.player_key)}>
                  {r.full_name}
                </Link>
              ),
            },
            { label: "Club", render: (r) => r.team ?? "" },
            { label: "Competition", render: (r) => r.competition ?? "" },
            { label: "Minutes", align: "r", render: (r) => int(r.minutes) },
            { label: "Prev 28d", align: "r", render: (r) => int(r.prev_minutes) },
            { label: "Change", align: "r", render: (r) => pct(r.minutes_change_pct, true) },
            { label: "Starts", align: "r", render: (r) => `${int(r.starts)} / ${int(r.prev_starts)}` },
            { label: "Team-minute share", align: "r", render: (r) => pct(r.minutes_share_pct) },
          ]}
        />
        <Note>Share of team minutes is capped at 100%. Minutes come from Highlightly box scores where present, otherwise from ESPN substitution clocks.</Note>
      </Section>
    </>
  );
}
