"use client";

import { Chip, type ColumnSpec, FilterBar, FilterRow, NoteComposer, Panel, PanelRows, type Row, Segmented, SortableTable, StateWord, Tag } from "@albiceleste/ui";
import type { Competition, MoverRow, RoundMatch, RoundRow } from "@albiceleste/data";
import { useEffect, useMemo, useState } from "react";
import { CompetitionChips } from "@/components/CompetitionChips";
import { FollowStar } from "@/components/FollowStar";
import { MoverWho, moverFact } from "@/components/MoverLine";
import type { EventContext } from "@/lib/events";
import { noteLabels } from "@/components/PlayerNotes";
import { useCompetitionFilter } from "@/lib/compfilter";
import { DASH, fmtDate, fmtDec, fmtInt } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { stateLabel, stateTone } from "@/lib/state";
import { useFollows, useNotes } from "@/lib/store";
import { boolParam, listParam, useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;

const cache = new Map<string, Promise<RoundRow[]>>();
function loadWeek(week: string): Promise<RoundRow[]> {
  if (!cache.has(week))
    cache.set(
      week,
      fetch(`/data/round/${week}`)
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => []),
    );
  return cache.get(week)!;
}

/** One match on one line: date, opponent, score, the player's part in it, and the note mark. The composer opens under it. */
function MatchToken({ m, locale, playerKey }: { m: RoundMatch; locale: Locale; playerKey: string }) {
  const d = t(locale);
  const { notes, add } = useNotes();
  const [open, setOpen] = useState(false);
  const mine = notes.filter((n) => n.player_key === playerKey && n.match_key === m.match_key);
  const role = m.played === null ? d.round.role.absent : m.played ? (m.is_starter ? d.round.role.start : d.round.role.sub) : d.round.role.unused;
  const opp = m.is_home ? m.away_team : m.home_team;
  const score = m.home_score === null || m.away_score === null ? "" : `${m.is_home ? m.home_score : m.away_score}–${m.is_home ? m.away_score : m.home_score}`;
  const label = `${fmtDate(locale, m.match_date, false)} ${m.is_home ? d.common.vs : "@"} ${opp} ${score}`;
  const part = m.played
    ? `${m.minutes}′${(m.goals ?? 0) > 0 ? ` · ${m.goals} G` : ""}${(m.assists ?? 0) > 0 ? ` · ${m.assists} A` : ""}${m.rating !== null ? ` · ${fmtDec(locale, m.rating, 1)}` : ""}`
    : role;
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="font-mono text-[11px] text-muted">{fmtDate(locale, m.match_date, false)}</span>
      <span>
        {m.is_home ? d.common.vs : "@"} {opp} <span className="num">{score}</span>
      </span>
      <span className="num text-muted">· {part}</span>
      <button
        type="button"
        className={`hit text-xs ${mine.length ? "text-celeste-deep" : "text-muted hover:text-ink"}`}
        aria-label={d.round.addNote}
        title={d.round.addNote}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        ✎{mine.length ? ` ${mine.length}` : ""}
      </button>
      {open && (
        <span className="block w-80 max-w-full whitespace-normal border-l-2 border-celeste pl-3 text-sm">
          {mine.map((n) => (
            <span key={n.id} className="mb-1 block">
              <span className="font-mono text-xs text-muted">{fmtDate(locale, n.date)}</span> {n.text}
            </span>
          ))}
          <NoteComposer
            labels={noteLabels(locale)}
            autoFocus
            onCancel={() => setOpen(false)}
            onSave={(text, verdict) => {
              add({
                player_key: playerKey,
                match_key: m.match_key,
                match_label: label,
                text,
                verdict,
              });
              setOpen(false);
            }}
          />
        </span>
      )}
    </span>
  );
}

/** Name, club, marks and state on one line. In a tight list the club gives way first, then the state; the name stays whole. */
function Who({ r, locale, current, reasonOnly = false, showState = true }: { r: RoundRow; locale: Locale; current: boolean; reasonOnly?: boolean; showState?: boolean }) {
  const d = t(locale);
  const state = reasonOnly && r.infirmary_reason ? d.infirmary[r.infirmary_reason] : stateLabel(d, r.state, r.infirmary_reason);
  return (
    <span className="flex min-w-0 items-baseline gap-2 whitespace-nowrap">
      <AppLink className="link shrink-0 font-medium" href={routes.player(locale, r.player_key)}>
        {r.full_name}
      </AppLink>
      <span className="min-w-0 truncate text-muted">{r.team}</span>
      {r.in_last_squad && (
        <span className="shrink-0">
          <Tag tone="accent">{d.marks.lastSquadShort}</Tag>
        </span>
      )}
      {current && showState && (reasonOnly || r.state !== "steady") && (
        <span className="hidden min-w-0 truncate sm:inline">
          <StateWord label={state} tone={reasonOnly ? "out" : stateTone(r.state)} />
        </span>
      )}
    </span>
  );
}

/**
 * A flat list for the players without numbers this week: one line each, grouped by position, in a panel. Long lists
 * fold after `limit` lines so three panels side by side end near the same height.
 */
function Lines({
  rows,
  locale,
  current,
  showMatches,
  reasonOnly = false,
  limit = 12,
}: {
  rows: RoundRow[];
  locale: Locale;
  current: boolean;
  showMatches: boolean;
  reasonOnly?: boolean;
  limit?: number;
}) {
  const d = t(locale);
  const [open, setOpen] = useState(false);
  const ordered = GROUPS.flatMap((g) => rows.filter((r) => r.pos_group === g).sort((a, b) => (a.pos_rank ?? 999) - (b.pos_rank ?? 999) || a.full_name.localeCompare(b.full_name)));
  const visible = open ? ordered : ordered.slice(0, limit);
  const role = (m: RoundMatch) => (m.played === null ? d.round.role.absent : m.played ? (m.is_starter ? d.round.role.start : d.round.role.sub) : d.round.role.unused);
  const line = (m: RoundMatch) =>
    `${fmtDate(locale, m.match_date, false)} ${m.is_home ? d.common.vs : "@"} ${m.is_home ? m.away_team : m.home_team} ${m.home_score ?? ""}–${m.away_score ?? ""} · ${role(m)}`;
  return (
    <>
      <ol className="text-sm">
        {GROUPS.map((g) => {
          const gr = visible.filter((r) => r.pos_group === g);
          if (gr.length === 0) return null;
          return (
            <li key={g}>
              <div className="border-b border-rule-strong pb-0.5 pt-3 font-mono text-[11px] uppercase tracking-wide text-muted">
                {d.pos[g]} · {rows.filter((r) => r.pos_group === g).length}
              </div>
              <ol>
                {gr.map((r) => (
                  <li key={r.player_key} className="flex min-h-9 min-w-0 items-center gap-3 border-b border-rule">
                    <span className="num w-6 shrink-0 text-right font-mono text-[11px] text-muted">{r.pos_rank ?? ""}</span>
                    <span className="min-w-0 flex-1">
                      <Who r={r} locale={locale} current={current} reasonOnly={reasonOnly} showState={!showMatches} />
                    </span>
                    {showMatches && r.matches.length > 0 && (
                      <span className="hidden shrink-0 text-xs text-ink-2 sm:inline" title={r.matches.map(line).join("\n")}>
                        {r.matches.map(role).join(" · ")}
                      </span>
                    )}
                    <FollowStar playerKey={r.player_key} locale={locale} />
                  </li>
                ))}
              </ol>
            </li>
          );
        })}
      </ol>
      {ordered.length > limit && (
        <button type="button" className="hit mt-2 self-start text-xs text-celeste-deep hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>
          {open ? d.common.showFewer : d.common.showMore(ordered.length - limit)}
        </button>
      )}
    </>
  );
}

export function RoundExplorer({
  rows: scoped,
  week,
  current,
  competitions,
  locale,
  standouts = [],
  ctx,
}: {
  rows: RoundRow[];
  week: string;
  current: boolean;
  competitions: Competition[];
  locale: Locale;
  standouts?: MoverRow[];
  ctx?: EventContext;
}) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const comp = useCompetitionFilter();
  const { follows } = useFollows();
  const pos = listParam(get("pos"));
  const squad = boolParam(get("squad"));
  const fol = boolParam(get("fol"));
  const scope = get("scope") === "all" ? "all" : "default";
  const [all, setAll] = useState<RoundRow[] | null>(null);
  useEffect(() => {
    if (scope === "all" || fol) loadWeek(week).then(setAll);
  }, [scope, fol, week]);

  const base = scope === "all" ? (all ?? scoped) : all && fol ? mergeFollowed(scoped, all, follows) : scoped;
  const shown = useMemo(
    () => base.filter((r) => (pos.length === 0 || pos.includes(r.pos_group)) && comp.matches(r.league) && (!squad || r.in_last_squad) && (!fol || follows.includes(r.player_key))),
    [base, pos, comp.selected, squad, fol, follows], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const toggle = (key: string, list: string[], v: string) =>
    set({
      [key]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(","),
    });

  const out = current ? shown.filter((r) => r.infirmary_reason) : [];
  const rest = current ? shown.filter((r) => !r.infirmary_reason) : shown;
  const played = rest.filter((r) => r.category === "played").sort((a, b) => (a.pos_rank ?? 999) - (b.pos_rank ?? 999) || a.full_name.localeCompare(b.full_name));
  const dnp = rest.filter((r) => r.category === "did_not_play");
  const idle = rest.filter((r) => r.category === "club_idle");

  const columns = useMemo<ColumnSpec[]>(
    () => [
      { key: "pos_rank", label: "#", kind: "int", width: "3rem" },
      {
        key: "full_name",
        label: d.common.player,
        render: (r) => (
          <span className="inline-block max-w-[22rem] align-baseline">
            <Who r={r as unknown as RoundRow} locale={locale} current={current} />
          </span>
        ),
      },
      {
        key: "matches",
        label: d.round.matches,
        sortable: false,
        priority: 2,
        render: (r) => (
          <span className="text-xs">
            {(r as unknown as RoundRow).matches.map((m, i) => (
              <span key={m.match_key}>
                {i > 0 && <span className="text-rule-strong"> | </span>}
                <MatchToken m={m} locale={locale} playerKey={r.player_key as string} />
              </span>
            ))}
          </span>
        ),
      },
      {
        key: "team_matches",
        label: d.round.cols.matches,
        kind: "int",
        priority: 3,
      },
      { key: "apps", label: d.round.cols.apps, kind: "int", priority: 2 },
      { key: "starts", label: d.round.cols.starts, kind: "int", priority: 3 },
      { key: "minutes", label: d.round.cols.minutes, kind: "int" },
      {
        key: "ga",
        label: d.round.cols.ga,
        kind: "int",
        sortValue: (r) => (r.goals as number) + (r.assists as number),
        render: (r) => ((r.goals as number) + (r.assists as number) > 0 ? `${r.goals}+${r.assists}` : DASH),
      },
      {
        key: "rating",
        label: d.round.cols.rating,
        kind: "dec1",
        priority: 2,
        render: (r) => fmtDec(locale, r.rating as number | null, 1),
      },
      {
        key: "follow",
        label: "",
        sortable: false,
        render: (r) => <FollowStar playerKey={r.player_key as string} locale={locale} />,
      },
    ],
    [d, locale, current],
  );

  const panels = [{ key: "did_not_play", rows: dnp, matches: true }, { key: "club_idle", rows: idle, matches: false }, ...(out.length > 0 ? [{ key: "out", rows: out, matches: false }] : [])].filter(
    (p) => p.rows.length > 0,
  ) as {
    key: RoundRow["category"] | "out";
    rows: RoundRow[];
    matches: boolean;
  }[];

  return (
    <>
      <FilterBar
        toggleLabel={d.common.filters}
        always={
          <FilterRow label={d.round.scope}>
            <Segmented
              label={d.round.scope}
              options={[
                { value: "default", label: d.round.scopeDefault },
                { value: "all", label: d.round.scopeAll },
              ]}
              value={scope}
              onChange={(v) => set({ scope: v === "all" ? "all" : null })}
            />
            {scope === "all" && !all && <span className="text-xs text-muted">{d.round.loading}</span>}
          </FilterRow>
        }
      >
        <FilterRow label={d.common.filters}>
          {GROUPS.map((g) => (
            <Chip key={g} pressed={pos.includes(g)} onClick={() => toggle("pos", pos, g)}>
              {d.pos[g]}
            </Chip>
          ))}
          <Chip pressed={squad} onClick={() => set({ squad: squad ? null : "1" })}>
            {d.pool.lastSquad}
          </Chip>
          <Chip pressed={fol} onClick={() => set({ fol: fol ? null : "1" })}>
            {d.common.followedOnly}
          </Chip>
        </FilterRow>
        <CompetitionChips competitions={competitions} locale={locale} filter={comp} />
      </FilterBar>

      {shown.length === 0 && <p className="text-sm text-muted">{d.round.none}</p>}

      {played.length > 0 && (
        <section className="mb-6">
          <div className="mb-2 flex items-baseline justify-between gap-4 border-b border-rule-strong pb-1">
            <h2 className="flex items-center gap-2 text-lg">
              <span className="stripe" aria-hidden="true" />
              {d.round.categories.played}
            </h2>
            <span className="num font-mono text-xs text-muted">{played.length}</span>
          </div>
          <SortableTable
            columns={columns}
            rows={played as unknown as Row[]}
            emptyText={d.common.empty}
            LinkComponent={AppLink}
            caption={d.round.categories.played}
            groupBy={{
              of: (r) => r.pos_group as string,
              order: [...GROUPS],
              label: (k, n) => `${d.pos[k as (typeof GROUPS)[number]]} · ${n}`,
            }}
          />
        </section>
      )}

      {(panels.length > 0 || standouts.length > 0) && (
        <div className={`grid gap-4 ${panels.length + (standouts.length > 0 ? 1 : 0) >= 2 ? "lg:grid-cols-2" : ""}`}>
          {standouts.length > 0 && ctx && (
            <Panel title={d.round.standouts} aside={<span className="num font-mono text-xs">{standouts.length}</span>}>
              <PanelRows rows={standouts.map((m) => ({ key: m.event_key, left: <MoverWho m={m} locale={locale} />, right: moverFact(m, locale, ctx) }))} />
            </Panel>
          )}
          {panels.map((p) => (
            <Panel key={p.key} title={d.round.categories[p.key]} aside={<span className="num font-mono text-xs">{p.rows.length}</span>}>
              <Lines rows={p.rows} locale={locale} current={current} showMatches={p.matches} reasonOnly={p.key === "out"} />
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}

function mergeFollowed(scoped: RoundRow[], all: RoundRow[], follows: string[]): RoundRow[] {
  const have = new Set(scoped.map((r) => r.player_key));
  return [...scoped, ...all.filter((r) => follows.includes(r.player_key) && !have.has(r.player_key))];
}
