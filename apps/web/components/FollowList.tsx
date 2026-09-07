"use client";

import { Line, RankArrow, StateWord, Tag } from "@albiceleste/ui";
import { useEffect, useMemo, useState } from "react";
import { FollowStar } from "@/components/FollowStar";
import { renderEvent, type EventContext } from "@/lib/events";
import { fmtDate, fmtKickoff } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { stateLabel, stateTone } from "@/lib/state";
import { useFollows, useNotes } from "@/lib/store";
import type { InfirmaryReason, State } from "@albiceleste/data";

export interface PoolJsonRow {
  k: string;
  n: string;
  t: string | null;
  c: string | null;
  g: string;
  a: number | null;
  r: number | null;
  d: number | null;
  s: State;
  i: InfirmaryReason | null;
  q: 0 | 1;
  lm: { d: string; o: string | null; h: boolean | null; m: number | null; st: boolean | null; f: number | null; ag: number | null } | null;
  nm: { o: string | null; h: boolean | null; k: string; c: string | null } | null;
  ev: { t: string; d: string; e: string | null } | null;
  mm: number;
}

let poolPromise: Promise<PoolJsonRow[]> | null = null;
export function loadPoolJson(): Promise<PoolJsonRow[]> {
  if (!poolPromise)
    poolPromise = fetch("/data/pool.json")
      .then((r) => r.json())
      .then((j: { rows: PoolJsonRow[] }) => j.rows)
      .catch(() => []);
  return poolPromise;
}

export function usePoolJson(): PoolJsonRow[] | null {
  const [rows, setRows] = useState<PoolJsonRow[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadPoolJson().then((r) => alive && setRows(r));
    return () => {
      alive = false;
    };
  }, []);
  return rows;
}

function LastMatch({ p, locale }: { p: PoolJsonRow; locale: Locale }) {
  const d = t(locale);
  if (!p.lm) return null;
  const role = p.lm.st ? d.common.starter : (p.lm.m ?? 0) > 0 ? d.common.sub : d.common.bench;
  return (
    <>
      {fmtDate(locale, p.lm.d, false)} {p.lm.h ? d.common.vs : "@"} {p.lm.o} {p.lm.f ?? "?"}–{p.lm.ag ?? "?"}, {p.lm.m ?? 0}′ {role}
    </>
  );
}

/** The follow block: one dense line per followed player, sorted by next kickoff. Shared by Home and Mi tablero. */
export function FollowList({ locale, ctx, suggestions, removable = false }: { locale: Locale; ctx: EventContext; suggestions: { key: string; name: string }[]; removable?: boolean }) {
  const d = t(locale);
  const rows = usePoolJson();
  const { follows, remove } = useFollows();
  const { forPlayer } = useNotes();
  const list = useMemo(() => {
    if (!rows) return [];
    const byKey = new Map(rows.map((r) => [r.k, r]));
    return follows
      .map((k) => byKey.get(k))
      .filter((r): r is PoolJsonRow => !!r)
      .sort((a, b) => (a.nm?.k ?? "9").localeCompare(b.nm?.k ?? "9") || (a.r ?? 999) - (b.r ?? 999));
  }, [rows, follows]);

  if (follows.length === 0) {
    return (
      <div className="text-sm text-ink-2">
        <p>{d.home.follow.empty}</p>
        <p className="mt-2">
          <span className="text-muted">{d.home.follow.suggest} </span>
          {suggestions.map((s, i) => (
            <span key={s.key}>
              {i > 0 && ", "}
              <AppLink className="link" href={routes.player(locale, s.key)}>
                {s.name}
              </AppLink>{" "}
              <FollowStar playerKey={s.key} locale={locale} />
            </span>
          ))}
        </p>
      </div>
    );
  }
  if (!rows) return <p className="text-sm text-muted">…</p>;
  return (
    <div>
      {list.map((p) => {
        const notes = forPlayer(p.k);
        return (
          <Line
            key={p.k}
            primary={
              <AppLink className="link" href={routes.player(locale, p.k)}>
                {p.n}
              </AppLink>
            }
            segments={[
              <>
                {p.t}
                {p.c ? `, ${p.c}` : ""}
              </>,
              <>
                {(d.posShort as Record<string, string>)[p.g]} {p.r ?? "–"} <RankArrow change={p.d} className="text-xs" />
              </>,
              <StateWord key="s" label={stateLabel(d, p.s, p.i)} tone={stateTone(p.s)} />,
              p.q ? <Tag tone="accent">{d.marks.lastSquadShort}</Tag> : null,
              <LastMatch key="lm" p={p} locale={locale} />,
              p.nm ? (
                <>
                  {d.common.next}: {p.nm.h ? d.common.vs : "@"} {p.nm.o}, {fmtKickoff(locale, p.nm.k)}
                </>
              ) : null,
              p.ev ? <span className="text-ink-2">{renderEvent(locale, p.ev.t, p.ev.e, ctx)}</span> : null,
              notes[0] ? <span className="text-muted">✎ {notes[0].text.length > 80 ? `${notes[0].text.slice(0, 80)}…` : notes[0].text}</span> : null,
            ]}
            right={
              removable ? (
                <button type="button" className="text-xs text-muted hover:text-danger" onClick={() => remove(p.k)}>
                  {d.board.remove}
                </button>
              ) : (
                <FollowStar playerKey={p.k} locale={locale} />
              )
            }
          />
        );
      })}
    </div>
  );
}
