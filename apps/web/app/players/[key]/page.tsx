import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPlayerKeys, getPlayerPage } from "@albiceleste/data";
import { LineChart, MinutesTimeline } from "@/components/charts";
import { EventList } from "@/components/EventList";
import { StaticTable } from "@/components/StaticTable";
import { Note, Section } from "@/components/ui";
import { DASH, date, dec1, dec2, eur, int, pct } from "@/lib/format";

export const dynamicParams = false;

export async function generateStaticParams() {
  const keys = await getPlayerKeys();
  return keys.map((key) => ({ key }));
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const page = await getPlayerPage(decodeURIComponent(key));
  return { title: page?.player.full_name ?? "Player" };
}

export default async function PlayerPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const page = await getPlayerPage(decodeURIComponent(key));
  if (!page) notFound();
  const { player: p, seasons, matches, form, events, history, transfers, valuations, sourceIds } = page;

  const meta = [
    p.current_team_name ? `${p.current_team_name}${p.current_competition ? `, ${p.current_competition}` : ""}` : "no current club in the tracked leagues",
    p.primary_position ?? null,
    p.age !== null ? `age ${p.age}` : null,
    p.eligibility_status,
    p.market_value_eur !== null ? eur(p.market_value_eur) : null,
  ].filter(Boolean);

  const flags = [
    p.has_arg_senior_cap ? "Argentina senior international" : null,
    p.has_arg_youth_cap ? "Argentina youth international" : null,
    p.has_other_senior_cap ? `Senior spell for another nation: ${p.other_senior_teams ?? "?"}` : null,
    p.is_injured ? `Injury listed: ${p.injury_status ?? ""}` : null,
  ].filter((x): x is string => !!x);

  const chron = [...matches].reverse().filter((m) => m.played || m.minutes_played > 0);

  return (
    <>
      <div className="mb-8">
        <h1 className="text-5xl">{p.full_name}</h1>
        <p className="mt-2 text-ink-2">{meta.join(" · ")}</p>
        {flags.length > 0 && <p className="mt-1 text-sm text-muted">{flags.join(" · ")}</p>}
      </div>

      <Section title="Season lines" aside="tracked competitions, current data">
        <StaticTable
          rows={seasons}
          rowKey={(r) => `${r.league}-${r.season_year}`}
          empty="No match rows in the tracked competitions."
          cols={[
            { label: "Season", render: (r) => String(r.season_year) },
            { label: "Competition", render: (r) => r.competition_name ?? r.league },
            { label: "Apps", align: "r", render: (r) => int(r.appearances) },
            { label: "Starts", align: "r", render: (r) => int(r.starts) },
            { label: "Minutes", align: "r", render: (r) => int(r.minutes) },
            { label: "G", align: "r", render: (r) => int(r.goals) },
            { label: "A", align: "r", render: (r) => int(r.assists) },
            { label: "xG", align: "r", render: (r) => dec2(r.xg) },
            { label: "xA", align: "r", render: (r) => dec2(r.xa) },
            { label: "Rating", align: "r", render: (r) => dec2(r.avg_rating) },
            { label: "G/90", align: "r", render: (r) => dec2(r.goals_per90) },
            { label: "Box scores", align: "r", render: (r) => `${int(r.rows_from_highlightly)} / ${int(r.rows_from_espn)}` },
          ]}
        />
        <Note>Box scores: rows from Highlightly / rows derived from ESPN summaries.</Note>
      </Section>

      {chron.length > 0 && (
        <Section title="Minutes per match" aside="last 60 matches · line is the rolling average of 5">
          <MinutesTimeline points={chron.map((m) => ({ date: m.match_date, minutes: m.minutes_played, starter: m.is_starter }))} />
        </Section>
      )}

      <div className="grid gap-10 lg:grid-cols-[2fr_1fr]">
        <Section title="Recent matches">
          <StaticTable
            rows={matches.slice(0, 25)}
            rowKey={(r) => r.match_key}
            empty="No matches."
            cols={[
              { label: "Date", render: (r) => date(r.match_date) },
              {
                label: "Match",
                render: (r) => `${r.home_team_name} ${r.home_score ?? ""}–${r.away_score ?? ""} ${r.away_team_name}`,
              },
              { label: "Comp.", render: (r) => r.competition_name },
              { label: "Role", render: (r) => (r.is_starter ? "start" : r.played ? "sub" : "bench") },
              { label: "Min", align: "r", render: (r) => int(r.minutes_played) },
              { label: "G", align: "r", render: (r) => int(r.goals) },
              { label: "A", align: "r", render: (r) => int(r.assists) },
              { label: "xG", align: "r", render: (r) => dec2(r.xg) },
              { label: "Rating", align: "r", render: (r) => dec1(r.match_rating) },
            ]}
          />
        </Section>
        <Section title="Rolling form" aside="each window vs the one before">
          <StaticTable
            rows={form}
            rowKey={(r) => String(r.window_days)}
            empty="No recent matches."
            cols={[
              { label: "Window", render: (r) => `${r.window_days} d` },
              { label: "Starts", align: "r", render: (r) => `${int(r.starts)} / ${int(r.apps)}` },
              { label: "Minutes", align: "r", render: (r) => int(r.minutes) },
              { label: "Prev", align: "r", render: (r) => int(r.prev_minutes) },
              { label: "Δ", align: "r", render: (r) => pct(r.minutes_change_pct, true) },
              { label: "Share", align: "r", render: (r) => pct(r.minutes_share_pct) },
            ]}
          />
          <div className="mt-6">
            <h3 className="mb-2 text-base">Events</h3>
            <EventList events={events.slice(0, 20)} />
          </div>
        </Section>
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Career by season" aside="Transfermarkt snapshot to June 2026">
          <StaticTable
            rows={history}
            rowKey={(r, i) => `${r.season}-${i}`}
            empty="No Transfermarkt history matched."
            cols={[
              { label: "Season", render: (r) => `${r.season}/${String(r.season + 1).slice(2)}` },
              { label: "Club", render: (r) => r.club_name ?? DASH },
              { label: "Competition", render: (r) => r.competition_name ?? DASH },
              { label: "Apps", align: "r", render: (r) => int(r.appearances) },
              { label: "Min", align: "r", render: (r) => int(r.minutes) },
              { label: "G", align: "r", render: (r) => int(r.goals) },
              { label: "A", align: "r", render: (r) => int(r.assists) },
            ]}
          />
        </Section>
        <Section title="Transfers">
          <StaticTable
            rows={transfers}
            rowKey={(r, i) => `${r.transfer_date}-${i}`}
            empty="No transfers matched."
            cols={[
              { label: "Date", render: (r) => date(r.transfer_date) },
              { label: "From", render: (r) => r.from_club_name ?? DASH },
              { label: "To", render: (r) => `${r.to_club_name ?? DASH}${r.to_country ? ` (${r.to_country})` : ""}` },
              { label: "Fee", align: "r", render: (r) => eur(r.transfer_fee_eur) },
              { label: "Value", align: "r", render: (r) => eur(r.market_value_eur) },
              { label: "Age", align: "r", render: (r) => int(r.age_at_transfer) },
            ]}
          />
          {valuations.length > 1 && (
            <div className="mt-6">
              <h3 className="mb-2 text-base">Market value</h3>
              <LineChart points={valuations.map((v) => ({ x: v.valuation_date, y: v.market_value_eur }))} format={eur} yLabel="market value" />
            </div>
          )}
        </Section>
      </div>

      <Section title="Sources">
        <StaticTable rows={sourceIds} rowKey={(r) => `${r.source}-${r.source_id}`} cols={[{ label: "Source", render: (r) => r.source }, { label: "Id", render: (r) => r.source_id }]} />
        <Note>
          Identity from {p.identity_source}; eligibility basis: {p.eligibility_basis ?? DASH}; squad snapshot {date(p.squad_as_of)}.
          {p.dob ? ` Born ${date(p.dob)}${p.place_of_birth ? `, ${p.place_of_birth}` : ""}.` : ""}
        </Note>
      </Section>
    </>
  );
}
