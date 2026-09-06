import type { Metadata } from "next";
import { manifest } from "@albiceleste/data";
import { PageTitle, Section } from "@albiceleste/ui";
import { date } from "@/lib/format";
import { REPO_URL } from "@/lib/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  const m = manifest();
  return (
    <div className="max-w-3xl">
      <PageTitle title="About and methodology" />
      <div className="prose-albiceleste space-y-4 text-[15px] leading-relaxed text-ink-2">
        <p>
          <strong className="text-ink">What this is.</strong> An open, free-data view of every footballer eligible for Argentina&apos;s senior national team who
          plays in Europe&apos;s top five leagues, Brazil&apos;s Série A or Argentina&apos;s Liga Profesional: who they are, where they play, how much they play, and
          what has changed recently. It is a portfolio project, not an official product. Source code, pipeline and models:{" "}
          <a className="link" href={REPO_URL}>
            {REPO_URL.replace("https://", "")}
          </a>
          .
        </p>
        <p>
          <strong className="text-ink">Data horizon.</strong> Matches through {date(m.data_as_of)}; squads as of {date(m.squad_as_of)}. The site is a snapshot
          refreshed by re-running the pipeline, so &ldquo;last 7 days&rdquo; style figures are relative to that date, not to today.
        </p>
      </div>

      <Section title="Eligibility">
        <p className="text-[15px] leading-relaxed text-ink-2">
          A player counts as eligible when he holds Argentine citizenship or has an Argentina senior cap, and has not been cap-tied to another nation at
          senior level. Players with a senior spell for another national team are shown as <em>review</em> rather than excluded, because eligibility switches
          are possible in some cases under FIFA rules. Youth-only Argentina internationals without evidence of citizenship are <em>youth_only</em> and left out
          of the main views.
        </p>
      </Section>

      <Section title="Sources">
        <table className="data">
          <thead>
            <tr>
              <th>Source</th>
              <th>Used for</th>
              <th>Terms</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Wikidata</td>
              <td>identity, citizenship, national-team spells, external ids</td>
              <td>CC0</td>
            </tr>
            <tr>
              <td>ESPN (public site API)</td>
              <td>squads with citizenship and birth dates, fixtures, match summaries with per-player stats and substitution clocks</td>
              <td>unofficial, read-only</td>
            </tr>
            <tr>
              <td>Highlightly</td>
              <td>per-match box scores (minutes, xG, xA, ratings)</td>
              <td>free tier, 100 requests per day</td>
            </tr>
            <tr>
              <td>football-data.org</td>
              <td>fixtures, standings, squads for European competitions</td>
              <td>free tier; football data provided by football-data.org</td>
            </tr>
            <tr>
              <td>Fantasy Premier League</td>
              <td>per-gameweek Premier League statistics</td>
              <td>public API</td>
            </tr>
            <tr>
              <td>Transfermarkt via transfermarkt-datasets</td>
              <td>career history, transfers, market values, frozen at 6 July 2026</td>
              <td>CC0</td>
            </tr>
          </tbody>
        </table>
      </Section>

      <Section title="How players are matched across sources">
        <p className="text-[15px] leading-relaxed text-ink-2">
          Precision first. Two records are the same person only when birth dates agree exactly and the names are compatible (a surname token appears in both and
          the given names are similar), with mutual-best assignment so one record cannot claim two identities. Ambiguous cases are listed on the Data Quality
          page rather than guessed. A small override file pins the few Highlightly nicknames and transliterations that rules cannot resolve.
        </p>
      </Section>

      <Section title="Minutes">
        <p className="text-[15px] leading-relaxed text-ink-2">
          Highlightly minutes are used where a box score exists. Otherwise minutes are derived from ESPN&apos;s starter and substitution clocks, with a 120-minute
          reference for matches that went to extra time. Where both sources exist, 98% of pairs agree within three minutes.
        </p>
      </Section>

      <Section title="Change detection">
        <p className="text-[15px] leading-relaxed text-ink-2">
          Events are computed in SQL from the ordered match sequence of each player: club changes with a stronger/weaker verdict from competition tier, first
          starts, streaks of starts or goals, returns from long absences, league debuts, and 28-day minute surges or drops. The watch feed shows events for
          players abroad plus Argentine-league players who enter the focus set through explicit rules, so the domestic league does not flood the feed.
        </p>
      </Section>

      <Section title="Known limitations">
        <ul className="list-disc space-y-1 pl-5 text-[15px] leading-relaxed text-ink-2">
          <li>Highlightly&apos;s free tier limits box scores to roughly 70 matches per day, so recent rows fall back to ESPN more often.</li>
          <li>Transfermarkt history is frozen at the snapshot date; destination country is unknown for leagues outside its 65 competitions.</li>
          <li>Injury flags come from ESPN rosters and lag reality.</li>
        </ul>
      </Section>
    </div>
  );
}
