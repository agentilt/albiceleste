import Link from "next/link";
import { Bars, EventList, Hero, Note, Section, Stat, StatRow, StaticTable } from "@albiceleste/ui";
import { getFeed, getKpis, getMovers, getPresence } from "@albiceleste/data";
import { int, pct, playerHref } from "@/lib/format";
import { AppLink } from "@/lib/link";

export default async function Home() {
  const [kpis, presence, feed, movers] = await Promise.all([getKpis(), getPresence(), getFeed(12), getMovers(15)]);
  const abroad = presence.filter((p) => p.country !== "Argentina");
  const home = presence.filter((p) => p.country === "Argentina");

  return (
    <>
      <Hero
        title="Who could play for Argentina, and what changed this week."
        lede="Every player eligible for the senior national team across Europe's top five leagues, Brazil and Argentina: where they play, how much they play, and the changes worth a look. Free data only; every number traces back to a source record."
      />

      <StatRow>
        <Stat label="Eligible players known" value={int(kpis.eligible)} />
        <Stat label="In tracked squads" value={int(kpis.in_squads)} />
        <Stat label="Playing abroad" value={int(kpis.abroad)} />
        <Stat label="In focus set" value={int(kpis.in_focus)} />
        <Stat label="Events, last 7 days" value={int(kpis.events_7d)} />
        <Stat label="Matches in data" value={int(kpis.matches)} />
      </StatRow>

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
          <EventList events={feed} hrefFor={playerHref} LinkComponent={AppLink} />
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
