"use client";

import { CallStrip, Hint, Radar, RankArrow, SearchInput, type SearchHit, Segmented, Sparkline, StateWord, Tag } from "@albiceleste/ui";
import type { ComparePlayer, SelectionWindow } from "@albiceleste/data";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { FollowStar, NoteCount } from "@/components/FollowStar";
import { type IndexEntry, loadIndex, searchIndex } from "@/components/PlayerSearch";
import { loadPoolJson } from "@/components/FollowList";
import { DASH, fmtDate, fmtDec, fmtEur, fmtInt, fmtPct, shareToPct } from "@/lib/fmt";
import { t, type Locale, windowLabel } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { stateLabel, stateTone } from "@/lib/state";
import { useFollows } from "@/lib/store";
import { listParam, useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;
type Group = (typeof GROUPS)[number];
const MAX = 4;

const cache = new Map<string, Promise<ComparePlayer | null>>();
function loadPlayer(key: string): Promise<ComparePlayer | null> {
  if (!cache.has(key))
    cache.set(
      key,
      fetch(`/data/players/${encodeURIComponent(key)}`)
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null),
    );
  return cache.get(key)!;
}

export function CompareTool({ locale, windows, horizon }: { locale: Locale; windows: SelectionWindow[]; horizon: string }) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const keys = listParam(get("p")).slice(0, MAX);
  const [players, setPlayers] = useState<ComparePlayer[]>([]);
  const [index, setIndex] = useState<IndexEntry[] | null>(null);
  const [q, setQ] = useState("");
  const [groupPick, setGroupPick] = useState<Group | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const { follows } = useFollows();

  useEffect(() => {
    loadIndex().then(setIndex);
  }, []);
  useEffect(() => {
    let alive = true;
    Promise.all(keys.map(loadPlayer)).then((ps) => {
      if (!alive) return;
      const found = ps.filter((p): p is ComparePlayer => !!p);
      const g = found[0]?.pos_group;
      const same = found.filter((p) => p.pos_group === g);
      setRefused(same.length < found.length ? (found.find((p) => p.pos_group !== g)?.full_name ?? null) : null);
      setPlayers(same);
    });
    return () => {
      alive = false;
    };
  }, [keys.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  const group: Group | null = (players[0]?.pos_group as Group | undefined) ?? groupPick;
  const hits = useMemo<SearchHit[]>(
    () =>
      index
        ? searchIndex(
            index.filter((e) => e.pos_group && (!group || e.pos_group === group) && !keys.includes(e.key)),
            q,
          ).map((e) => ({ key: e.key, name: e.name, detail: e.team }))
        : [],
    [index, q, group, keys],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  async function seed() {
    const rows = await loadPoolJson();
    const g = group;
    const picks = rows.filter((r) => follows.includes(r.k) && (!g || r.g === g)).slice(0, MAX);
    if (picks.length === 0) {
      setSeedMsg(d.compare.seedNone);
      return;
    }
    setSeedMsg(null);
    set({ p: picks.map((r) => r.k).join(",") });
  }

  const axes = players[0]?.axes.map((a) => ({ key: a.key, label: (d.compare.axes as Record<string, string>)[a.key] ?? a.key })) ?? [];
  const domain: [string, string] = [addDays(horizon, -120), horizon];
  const announced = windows.filter((w) => w.announcement_date && w.announcement_date <= horizon && w.listed > 0);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        {players.length === 0 ? (
          <Segmented<Group> options={GROUPS.map((g) => ({ value: g, label: d.pos[g] }))} value={groupPick ?? ("" as Group)} onChange={setGroupPick} label={d.common.position} />
        ) : (
          <span className="font-mono text-xs uppercase tracking-wide text-muted">{d.pos[group!]}</span>
        )}
        {players.length < MAX && group && (
          <SearchInput
            value={q}
            onChange={setQ}
            hits={hits}
            placeholder={d.compare.add}
            width="w-48 sm:w-56"
            onSelect={(h) => {
              setQ("");
              set({ p: [...players.map((p) => p.player_key), h.key].join(",") });
            }}
          />
        )}
        <button type="button" className="chip" onClick={seed}>
          {d.compare.seed}
        </button>
        {keys.length > 0 && (
          <button type="button" className="chip" onClick={() => set({ p: null })}>
            {d.compare.clear}
          </button>
        )}
        {seedMsg && (
          <span className="text-xs text-ink-2" role="status">
            {seedMsg}
          </span>
        )}
      </div>
      {refused && (
        <p className="mb-4 text-sm text-danger">
          {d.compare.crossPosition} ({refused})
        </p>
      )}
      {players.length === 0 && <p className="text-sm text-muted">{keys.length ? "…" : d.compare.empty}</p>}

      {players.length > 0 && (
        <>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_1fr]">
            <div>
              <Radar axes={axes} series={players.map((p) => ({ name: p.full_name, values: p.axes.map((a) => a.pct) }))} size={420} label={d.compare.title} />
              <p className="mt-1 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted">
                {d.compare.radar}
                <Hint text={`${d.compare.radarHint} ${axes.map((a) => `${a.label}: ${(d.compare.axesLong as Record<string, string>)[a.key]}.`).join(" ")}`} />
              </p>
            </div>
            <div className="scroll-x">
              <table className="data">
                <thead>
                  <tr>
                    <th />
                    {players.map((p, i) => (
                      <th key={p.player_key} style={{ minWidth: "11rem" }}>
                        <span className="inline-flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5" style={{ background: ["var(--color-ink)", "var(--color-celeste-deep)", "var(--color-gold)", "var(--color-danger)"][i] }} />
                          <AppLink className="link normal-case" href={routes.player(locale, p.player_key)}>
                            {p.full_name}
                          </AppLink>
                          <button
                            type="button"
                            className="hit px-1 text-muted hover:text-danger"
                            aria-label={`${d.board.remove} ${p.full_name}`}
                            title={d.board.remove}
                            onClick={() => set({ p: keys.filter((k) => k !== p.player_key).join(",") })}
                          >
                            ×
                          </button>
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <Row label={d.common.club} cells={players.map((p) => `${p.team ?? DASH}${p.competition ? `, ${p.competition}` : ""}`)} />
                  <Row label={d.common.age} cells={players.map((p) => fmtInt(locale, p.age))} />
                  <Row
                    label={d.common.state}
                    cells={players.map((p) => (
                      <StateWord key={p.player_key} label={stateLabel(d, p.state, p.infirmary_reason)} tone={stateTone(p.state)} />
                    ))}
                  />
                  <Row
                    label={d.common.rank}
                    cells={players.map((p) => (
                      <span key={p.player_key} className="inline-flex items-baseline gap-2">
                        {p.pos_rank ? `${p.pos_rank} / ${p.pos_size}` : d.compare.noScore} <RankArrow change={p.rank_change} className="text-xs" />
                        {p.in_last_squad && <Tag tone="accent">{d.marks.lastSquadShort}</Tag>}
                      </span>
                    ))}
                  />
                  <SectionRow label={d.compare.sections.rank} n={players.length} />
                  {axes.map((a, ai) => {
                    const vals = players.map((p) => p.axes[ai]?.value ?? null);
                    const invert = a.key === "conceded_per90";
                    const best = bestIndex(vals, invert);
                    return (
                      <Row
                        key={a.key}
                        label={a.label}
                        title={(d.compare.axesLong as Record<string, string>)[a.key]}
                        cells={players.map((p, i) => {
                          const v = vals[i] ?? null;
                          const pct = p.axes[ai]?.pct;
                          const rawDiff = best !== null && i !== best && v !== null && vals[best] !== null ? v - vals[best]! : null;
                          const diff = rawDiff !== null && Math.abs(rawDiff) >= 0.005 ? rawDiff : null;
                          return (
                            <span key={p.player_key} className={i === best ? "font-medium text-ink" : ""}>
                              {formatAxis(locale, a.key, v)}
                              {pct !== null && pct !== undefined && (
                                <span className="ml-1 font-mono text-xs text-muted">
                                  {d.compare.pctShort} {pct}
                                </span>
                              )}
                              {i === best && vals.filter((x) => x !== null).length > 1 && <Tag tone="accent"> {d.compare.best}</Tag>}
                              {diff !== null && <span className="ml-1 text-xs text-muted">{formatDiff(d, locale, a.key, diff)}</span>}
                            </span>
                          );
                        })}
                      />
                    );
                  })}
                  <SectionRow label={d.compare.sections.form} n={players.length} />
                  <Row
                    label={d.player.minutesPerMatch}
                    cells={players.map((p) => (
                      <Sparkline key={p.player_key} points={p.spark} domain={domain} label={`${d.player.minutesPerMatch} · ${p.full_name}`} />
                    ))}
                  />
                  <SectionRow label={d.compare.sections.season} n={players.length} />
                  <Row label={d.common.apps} cells={players.map((p) => `${fmtInt(locale, p.season.apps)} (${fmtInt(locale, p.season.starts)} ${d.common.starts.toLowerCase()})`)} />
                  <Row label={d.common.minutes} cells={players.map((p) => fmtInt(locale, p.season.minutes))} />
                  <Row label={`${d.common.goals} / ${d.common.assists}`} cells={players.map((p) => `${fmtInt(locale, p.season.goals)} / ${fmtInt(locale, p.season.assists)}`)} />
                  <Row label={d.common.per90} cells={players.map((p) => fmtDec(locale, p.season.ga_per90))} />
                  {players.every((p) => p.season.xg !== null) && <Row label="xG / xA" cells={players.map((p) => `${fmtDec(locale, p.season.xg)} / ${fmtDec(locale, p.season.xa)}`)} />}
                  {players.every((p) => p.season.avg_rating !== null) && <Row label={d.common.rating} cells={players.map((p) => fmtDec(locale, p.season.avg_rating))} />}
                  <SectionRow label={d.compare.sections.selection} n={players.length} />
                  <Row
                    label={d.compare.lists}
                    cells={players.map((p) => (
                      <CallStrip
                        key={p.player_key}
                        marks={announced.map((w) => ({
                          id: w.window_id,
                          label: windowLabel(locale, w),
                          status: (p.calls.find((c) => c.window_id === w.window_id)?.status as "called" | undefined) ?? null,
                        }))}
                        statusLabels={d.player.callStatus}
                        notCalled={d.player.notCalled}
                        pending={d.player.pending}
                      />
                    ))}
                  />
                  <Row label={d.compare.caps} cells={players.map((p) => `${fmtInt(locale, p.caps)}${p.first_cap ? ` · ${fmtDate(locale, p.first_cap)}` : ""}`)} />
                  <SectionRow label={d.compare.sections.context} n={players.length} />
                  <Row label={d.common.tier} cells={players.map((p) => fmtInt(locale, p.level_rank))} />
                  <Row label={d.compare.minutesLastSeason} cells={players.map((p) => fmtInt(locale, p.season.minutes_last_season))} />
                  <Row label={d.common.value} cells={players.map((p) => fmtEur(locale, p.market_value_eur))} />
                  <Row
                    label=""
                    cells={players.map((p) => (
                      <span key={p.player_key} className="inline-flex items-baseline gap-3">
                        <FollowStar playerKey={p.player_key} locale={locale} />
                        <NoteCount playerKey={p.player_key} locale={locale} />
                      </span>
                    ))}
                  />
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Row({ label, cells, title }: { label: string; cells: ReactNode[]; title?: string }) {
  return (
    <tr>
      <td className="text-muted" title={title}>
        {label}
      </td>
      {cells.map((c, i) => (
        <td key={i} className="wrap">
          {c}
        </td>
      ))}
    </tr>
  );
}

function SectionRow({ label, n }: { label: string; n: number }) {
  return (
    <tr className="group-row">
      <td colSpan={n + 1}>{label}</td>
    </tr>
  );
}

function bestIndex(vals: (number | null)[], invert: boolean): number | null {
  let best: number | null = null;
  vals.forEach((v, i) => {
    if (v === null) return;
    if (best === null || (invert ? v < vals[best]! : v > vals[best]!)) best = i;
  });
  return best;
}

function formatAxis(locale: Locale, key: string, v: number | null): string {
  if (v === null) return DASH;
  switch (key) {
    case "minutes_share":
    case "starts_share":
    case "clean_sheet_rate":
      return fmtPct(locale, shareToPct(v));
    case "competition_w":
      return fmtDec(locale, v, 1);
    case "trend":
      return fmtPct(locale, v, true);
    default:
      return fmtDec(locale, v);
  }
}

function formatDiff(d: ReturnType<typeof t>, locale: Locale, key: string, diff: number): string {
  const signed = (v: number, digits: number) => `${v > 0 ? "+" : ""}${fmtDec(locale, v, digits)}`;
  switch (key) {
    case "minutes_share":
    case "starts_share":
    case "clean_sheet_rate":
      return d.compare.diff.pp(signed(Math.round(diff * 100), 0));
    case "trend":
      return d.compare.diff.pp(signed(Math.round(diff), 0));
    case "ga_per90":
    case "conceded_per90":
      return d.compare.diff.per90(signed(diff, 2));
    default:
      return d.compare.diff.plain(signed(diff, 2));
  }
}

function addDays(ymd: string, n: number): string {
  const [y, m, dd] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, dd! + n)).toISOString().slice(0, 10);
}
