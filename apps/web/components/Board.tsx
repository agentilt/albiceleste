"use client";

import { Chip, Note, NoteList, Section } from "@albiceleste/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { FollowList, usePoolJson } from "@/components/FollowList";
import { noteLabels } from "@/components/PlayerNotes";
import type { EventContext } from "@/lib/events";
import { fmtDate } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { decodeShare, encodeShare, exportStore, importStore, useFollows, useNotes } from "@/lib/store";
import { useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;

export function Board({ locale, ctx, suggestions }: { locale: Locale; ctx: EventContext; suggestions: { key: string; name: string }[] }) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const { follows, set: setFollows, merge } = useFollows();
  const { notes, edit, remove } = useNotes();
  const rows = usePoolJson();
  const [msg, setMsg] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);
  const shared = useMemo(() => decodeShare(get("follow")), [get]);
  const [pending, setPending] = useState<string[] | null>(null);
  useEffect(() => {
    if (shared.length) setPending(shared);
  }, [shared]);

  const names = useMemo(() => new Map((rows ?? []).map((r) => [r.k, r])), [rows]);
  const byPlayer = useMemo(() => {
    const m = new Map<string, typeof notes>();
    for (const n of [...notes].sort((a, b) => b.date.localeCompare(a.date))) m.set(n.player_key, [...(m.get(n.player_key) ?? []), n]);
    return m;
  }, [notes]);

  function share() {
    const url = `${window.location.origin}${routes.board(locale)}?follow=${encodeShare(follows)}`;
    navigator.clipboard?.writeText(url).then(() => setMsg(d.board.shared)).catch(() => setMsg(url));
  }
  function doExport() {
    const blob = new Blob([exportStore()], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `albiceleste-tablero-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  }
  function doImport(f: File) {
    f.text().then((text) => {
      const r = importStore(text);
      setMsg(r ? d.board.imported(r.follows, r.notes) : d.board.importError);
    });
  }

  return (
    <>
      {pending && (
        <div className="mb-6 flex flex-wrap items-center gap-3 border border-celeste bg-celeste-tint px-3 py-2 text-sm">
          <span>{d.board.importFromLink(pending.length)}</span>
          <Chip pressed={false} onClick={() => { setFollows(pending); setPending(null); set({ follow: null }); }}>
            {d.board.replace}
          </Chip>
          <Chip pressed={false} onClick={() => { merge(pending); setPending(null); set({ follow: null }); }}>
            {d.board.merge}
          </Chip>
          <Chip pressed={false} onClick={() => { setPending(null); set({ follow: null }); }}>
            {d.board.ignore}
          </Chip>
        </div>
      )}

      <Section
        title={d.board.follows}
        aside={
          follows.length > 0 ? (
            <button type="button" className="link" onClick={share}>
              {d.board.share}
            </button>
          ) : undefined
        }
      >
        {follows.length === 0 && <p className="mb-3 text-sm text-ink-2">{d.board.empty}</p>}
        <FollowList locale={locale} ctx={ctx} suggestions={suggestions} removable />
        {follows.length > 1 && rows && (
          <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted">{d.board.compareFollowed}:</span>
            {GROUPS.map((g) => {
              const ks = follows.filter((k) => names.get(k)?.g === g).slice(0, 4);
              return ks.length >= 2 ? (
                <AppLink key={g} className="link" href={routes.compare(locale, ks)}>
                  {d.pos[g]} ({ks.length})
                </AppLink>
              ) : null;
            })}
          </p>
        )}
      </Section>

      <Section title={d.board.notes}>
        {notes.length === 0 ? (
          <p className="text-sm text-ink-2">{d.board.notesEmpty}</p>
        ) : (
          <div className="grid gap-8 lg:grid-cols-2">
            {[...byPlayer.entries()].map(([k, ns]) => (
              <div key={k}>
                <h3 className="mb-1 border-b border-rule-strong pb-1 text-base">
                  <AppLink className="link" href={routes.player(locale, k)}>
                    {names.get(k)?.n ?? k}
                  </AppLink>
                  {names.get(k)?.t && <span className="text-sm text-muted"> · {names.get(k)!.t}</span>}
                </h3>
                <NoteList notes={ns.map((n) => ({ id: n.id, date: n.date, text: n.text, verdict: n.verdict, match: n.match_key, matchLabel: n.match_label }))} labels={noteLabels(locale)} onEdit={edit} onRemove={remove} formatDate={(iso) => fmtDate(locale, iso)} />
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title={`${d.board.export} / ${d.board.import}`}>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <Chip pressed={false} onClick={doExport}>
            {d.board.export}
          </Chip>
          <Chip pressed={false} onClick={() => file.current?.click()}>
            {d.board.import}
          </Chip>
          <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
          {msg && <span className="text-ink-2">{msg}</span>}
        </div>
        <Note>{d.board.warning}</Note>
      </Section>
    </>
  );
}
