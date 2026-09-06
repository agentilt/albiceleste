import type { Metadata } from "next";
import { getAgreement, getCoverage, getPipelineRuns, getRawSummary, getStatsBySource, getUnmatched, manifest } from "@albiceleste/data";
import { StaticTable } from "@/components/StaticTable";
import { Note, PageTitle, Section } from "@/components/ui";
import { datetime, dec1, dec2, int, pct } from "@/lib/format";

export const metadata: Metadata = { title: "Data quality" };

export default async function QualityPage() {
  const [raw, bySource, agreement, coverage, unmatched, runs] = await Promise.all([
    getRawSummary(),
    getStatsBySource(),
    getAgreement(),
    getCoverage(),
    getUnmatched(),
    getPipelineRuns(),
  ]);
  const m = manifest();
  const tables = Object.entries(m.tables).map(([name, t]) => ({ name, ...t }));

  return (
    <>
      <PageTitle title="Data quality and provenance" lede={`Snapshot exported ${datetime(m.exported_at)} from commit ${m.git_commit ?? "?"}. Every API response is stored as a versioned record; unchanged payloads are never rewritten.`} />

      <Section title="Raw layer">
        <StaticTable
          rows={raw}
          rowKey={(r) => `${r.source}-${r.entity}`}
          cols={[
            { label: "Source", render: (r) => r.source },
            { label: "Entity", render: (r) => r.entity },
            { label: "Records", align: "r", render: (r) => int(r.records) },
            { label: "Versions", align: "r", render: (r) => int(r.versions) },
            { label: "Last ingested", render: (r) => datetime(r.last_ingested) },
          ]}
        />
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Player-match rows by source">
          <StaticTable
            rows={bySource}
            rowKey={(r) => `${r.league}-${r.stats_source}`}
            cols={[
              { label: "League", render: (r) => r.league },
              { label: "Source", render: (r) => r.stats_source },
              { label: "Rows", align: "r", render: (r) => int(r.rows) },
              { label: "Players", align: "r", render: (r) => int(r.players) },
            ]}
          />
        </Section>
        <Section title="Highlightly vs derived ESPN minutes">
          {agreement ? (
            <dl className="grid grid-cols-2 gap-y-2 text-sm">
              <dt className="text-muted">Player-matches with both sources</dt>
              <dd className="num">{int(agreement.pairs)}</dd>
              <dt className="text-muted">Within 3 minutes</dt>
              <dd className="num">{pct(agreement.pct_within_3_min)}</dd>
              <dt className="text-muted">Mean absolute difference</dt>
              <dd className="num">{dec2(agreement.mean_abs_diff)} min</dd>
              <dt className="text-muted">Largest difference</dt>
              <dd className="num">{int(agreement.max_abs_diff)} min</dd>
            </dl>
          ) : (
            <p className="text-sm text-muted">Not computed.</p>
          )}
          <Note>Validates the substitution-clock derivation of ESPN minutes against Highlightly box scores for the same player and match.</Note>
        </Section>
      </div>

      <Section title="Coverage by league" aside="completed matches">
        <StaticTable
          rows={coverage}
          rowKey={(r) => r.league}
          cols={[
            { label: "League", render: (r) => r.league },
            { label: "Matches", align: "r", render: (r) => int(r.matches) },
            { label: "Highlightly match", align: "r", render: (r) => int(r.with_highlightly_match) },
            { label: "football-data match", align: "r", render: (r) => int(r.with_fd_match) },
            { label: "Box-score rows", align: "r", render: (r) => int(r.with_box_score_rows) },
            { label: "Box-score share", align: "r", render: (r) => dec1((100 * r.with_box_score_rows) / Math.max(1, r.matches)) + "%" },
          ]}
        />
      </Section>

      <Section title="Entity-resolution leftovers" aside={`${int(unmatched.length)} rows for human review`}>
        <div className="max-h-[32rem] overflow-auto">
          <StaticTable
            rows={unmatched}
            rowKey={(r, i) => `${r.issue}-${r.subject_id}-${i}`}
            cols={[
              { label: "Issue", render: (r) => r.issue.replace(/_/g, " ") },
              { label: "League", render: (r) => r.league ?? "" },
              { label: "Subject", render: (r) => r.subject ?? "" },
              { label: "Id", render: (r) => r.subject_id ?? "" },
              { label: "Detail", render: (r) => r.detail ?? "" },
            ]}
          />
        </div>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title="Recent pipeline runs">
          <StaticTable
            rows={runs}
            rowKey={(r, i) => `${r.started_at}-${i}`}
            cols={[
              { label: "Started", render: (r) => datetime(r.started_at) },
              { label: "Command", render: (r) => r.command },
              { label: "Status", render: (r) => r.status },
              { label: "New versions", align: "r", render: (r) => int(r.records_written) },
              { label: "Requests", align: "r", render: (r) => int(r.requests_made) },
            ]}
          />
        </Section>
        <Section title="Published tables">
          <StaticTable
            rows={tables}
            rowKey={(r) => r.name}
            cols={[
              { label: "Table", render: (r) => r.name },
              { label: "Rows", align: "r", render: (r) => int(r.rows) },
              { label: "KB", align: "r", render: (r) => int(Math.round(r.bytes / 1024)) },
            ]}
          />
        </Section>
      </div>
    </>
  );
}
