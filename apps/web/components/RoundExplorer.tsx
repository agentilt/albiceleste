"use client";

import { Chip, FilterBar, FilterRow, Note, NoteComposer, RankArrow, Segmented, StateWord, Tag } from "@albiceleste/ui";
import type { Competition, RoundMatch, RoundRow } from "@albiceleste/data";
import { useEffect, useMemo, useState } from "react";
import { CompetitionChips } from "@/components/CompetitionChips";
import { FollowStar } from "@/components/FollowStar";
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
  if (!cache.has(week)) cache.set(week, fetch(`/data/round/${week}`).then((r) => (r.ok ? r.json() : [])).catch(() => []));
  return cache.get(week)!;
}

function MatchLine({ m, locale, playerKey }: { m: RoundMatch; locale: Locale; playerKey: string }) {
  const d = t(locale);
  const { notes, add } = useNotes();
  const [open, setOpen] = useState(false);
  const mine = notes.filter((n) => n.player_key === playerKey && n.match_key === m.match_key);
  const role = m.played === null ? d.round.role.absent : m.played ? (m.is_starter ? d.round.role.start : d.round.role.sub) : d.round.role.unused;
  const score = `${m.home_team} ${m.home_score ?? ""}–${m.away_score ?? ""} ${m.away_team}`;
  return (
    <div className="text-xs text-ink-2">
      <span className="font-mono text-muted">{fmtDate(locale, m.match_date, false)}</span> {score}
      <span className="text-muted"> · {role}</span>
      {m.played && (
        <span className="num">
          {" "}
          · {m.minutes}′{(m.goals ?? 0) > 0 ? ` · ${m.goals} G` : ""}
          {(m.assists ?? 0) > 0 ? ` · ${m.assists} A` : ""}
          {m.rating !== null ? ` · ${fmtDec(locale, m.rating, 1)}` : ""}
        </span>
      )}{" "}
      <button type="button" className="link" onClick={() => setOpen(!open)}>
        {mine.length ? `✎ ${mine.length}` : `+ ${d.player.noteOnMatch}`}
      </button>
      {open && (
        <div className="mt-2 max-w-xl border-l-2 border-celeste pl-3">
          {mine.map((n) => (
            <p key={n.id} className="mb-1 text-sm">
              <span className="font-mono text-xs text-muted">{fmtDate(locale, n.date)}</span> {n.text}
            </p>
          ))}
          <NoteComposer
            labels={noteLabels(locale)}
            onCancel={() => setOpen(false)}
            onSave={(text, verdict) => {
              add({ player_key: playerKey, match_key: m.match_key, match_label: `${fmtDate(locale, m.match_date, false)} ${score}`, text, verdict });
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}

function Row({ r, locale, current }: { r: RoundRow; locale: Locale; current: boolean }) {
  const d = t(locale);
  return (
    <tr>
      <td className="r num text-muted">{r.pos_rank ?? DASH}</td>
      <td className="wrap">
        <span className="inline-flex flex-wrap items-baseline gap-2">
          <AppLink className="link font-medium" href={routes.player(locale, r.player_key)}>
            {r.full_name}
          </AppLink>
          <span className="text-muted">{r.team}</span>
          {r.in_last_squad && <Tag tone="accent">{d.marks.lastSquadShort}</Tag>}
          {current && <StateWord label={stateLabel(d, r.state, r.infirmary_reason)} tone={stateTone(r.state)} />}
        </span>
        <div className="mt-1 flex flex-col gap-0.5">
          {r.matches.map((m) => (
            <MatchLine key={m.match_key} m={m} locale={locale} playerKey={r.player_key} />
          ))}
        </div>
      </td>
      <td className="r">{fmtInt(locale, r.team_matches)}</td>
      <td className="r">{fmtInt(locale, r.apps)}</td>
      <td className="r">{fmtInt(locale, r.starts)}</td>
      <td className="r">{fmtInt(locale, r.minutes)}</td>
      <td className="r">{r.goals + r.assists > 0 ? `${r.goals}+${r.assists}` : DASH}</td>
      <td className="r">{fmtDec(locale, r.rating, 1)}</td>
      <td>
        <FollowStar playerKey={r.player_key} locale={locale} />
      </td>
    </tr>
  );
}

export function RoundExplorer({ rows: scoped, week, current, competitions, locale }: { rows: RoundRow[]; week: string; current: boolean; competitions: Competition[]; locale: Locale }) {
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
  const toggle = (key: string, list: string[], v: string) => set({ [key]: (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]).join(",") });

  const groups = GROUPS.filter((g) => pos.length === 0 || pos.includes(g));
  const cats: RoundRow["category"][] = ["played", "did_not_play", "club_idle"];
  const out = current ? shown.filter((r) => r.infirmary_reason) : [];

  return (
    <>
      <FilterBar>
        <FilterRow label={d.common.filters}>
          <Segmented
            options={[
              { value: "default", label: d.round.scopeDefault },
              { value: "all", label: d.round.scopeAll },
            ]}
            value={scope}
            onChange={(v) => set({ scope: v === "all" ? "all" : null })}
          />
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
          {scope === "all" && !all && <span className="text-xs text-muted">{d.round.loading}</span>}
        </FilterRow>
        <CompetitionChips competitions={competitions} locale={locale} filter={comp} />
      </FilterBar>

      {shown.length === 0 && <p className="text-sm text-muted">{d.round.none}</p>}

      {cats.map((cat) => {
        const inCat = shown.filter((r) => r.category === cat && !(current && r.infirmary_reason));
        if (inCat.length === 0) return null;
        return (
          <section key={cat} className="mb-10">
            <h2 className="mb-3 border-b border-rule-strong pb-1 text-xl">
              {d.round.categories[cat]} <span className="text-sm text-muted">{inCat.length}</span>
            </h2>
            <div className="flex flex-col gap-6">
              {groups.map((g) => {
                const gr = inCat.filter((r) => r.pos_group === g);
                if (gr.length === 0) return null;
                return (
                  <div key={g}>
                    <h3 className="mb-1 font-sans text-xs font-medium uppercase tracking-wide text-muted">
                      {d.pos[g]} <span className="normal-case tracking-normal">· {gr.length}</span>
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="data">
                        <thead>
                          <tr>
                            <th className="r">#</th>
                            <th>{d.common.player}</th>
                            <th className="r">{d.round.cols.matches}</th>
                            <th className="r">{d.round.cols.apps}</th>
                            <th className="r">{d.round.cols.starts}</th>
                            <th className="r">{d.round.cols.minutes}</th>
                            <th className="r">{d.round.cols.ga}</th>
                            <th className="r">{d.round.cols.rating}</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {gr.map((r) => (
                            <Row key={r.player_key} r={r} locale={locale} current={current} />
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      {out.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-3 border-b border-rule-strong pb-1 text-xl">
            {d.round.categories.out} <span className="text-sm text-muted">{out.length}</span>
          </h2>
          <ol className="text-sm">
            {out.map((r) => (
              <li key={r.player_key} className="flex flex-wrap items-baseline gap-x-2 border-b border-rule py-1.5">
                <AppLink className="link font-medium" href={routes.player(locale, r.player_key)}>
                  {r.full_name}
                </AppLink>
                <span className="text-muted">{r.team}</span>
                <StateWord label={stateLabel(d, r.state, r.infirmary_reason)} tone={stateTone(r.state)} />
                {r.in_last_squad && <Tag tone="accent">{d.marks.lastSquadShort}</Tag>}
                {r.pos_rank && (
                  <span className="font-mono text-xs text-muted">
                    {(d.posShort as Record<string, string>)[r.pos_group]} {r.pos_rank} <RankArrow change={null} />
                  </span>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}
      <Note>{d.round.footnote}</Note>
    </>
  );
}

function mergeFollowed(scoped: RoundRow[], all: RoundRow[], follows: string[]): RoundRow[] {
  const have = new Set(scoped.map((r) => r.player_key));
  return [...scoped, ...all.filter((r) => follows.includes(r.player_key) && !have.has(r.player_key))];
}
