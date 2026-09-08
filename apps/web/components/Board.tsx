"use client";

import { Hint, NoteList, Panel } from "@albiceleste/ui";
import { useEffect, useMemo, useRef, useState } from "react";
import { FollowList, usePoolJson } from "@/components/FollowList";
import { noteLabels } from "@/components/PlayerNotes";
import type { EventContext } from "@/lib/events";
import { fmtDate } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { decodeShare, encodeShare, exportStore, importStore, type Note, useFollows, useNotes } from "@/lib/store";
import { useUrlState } from "@/lib/urlstate";

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;

/** A short confirmation next to the control that caused it, with an optional undo. */
function Flash({ text, undo, onUndo }: { text: string | null; undo?: string; onUndo?: () => void }) {
  if (!text) return null;
  return (
    <span className="text-xs text-ink-2" role="status">
      {text}
      {onUndo && undo && (
        <>
          {" · "}
          <button type="button" className="link" onClick={onUndo}>
            {undo}
          </button>
        </>
      )}
    </span>
  );
}

export function Board({ locale, ctx, suggestions }: { locale: Locale; ctx: EventContext; suggestions: { key: string; name: string }[] }) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const { follows, set: setFollows, merge } = useFollows();
  const { notes, add: addNote, edit, remove: removeNote } = useNotes();
  const rows = usePoolJson();
  const [shareMsg, setShareMsg] = useState<string | null>(null);
  const [ioMsg, setIoMsg] = useState<string | null>(null);
  const [removed, setRemoved] = useState<{ key: string; name: string } | null>(null);
  const [removedNote, setRemovedNote] = useState<Note | null>(null);
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
    navigator.clipboard
      ?.writeText(url)
      .then(() => setShareMsg(d.board.shared))
      .catch(() => setShareMsg(url));
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
      setIoMsg(r ? d.board.imported(r.follows, r.notes) : d.board.importError);
    });
  }
  const compareLinks = GROUPS.map((g) => ({ g, ks: follows.filter((k) => names.get(k)?.g === g).slice(0, 4) })).filter((x) => x.ks.length >= 2);

  return (
    <>
      {pending && (
        <div className="mb-4 flex flex-wrap items-center gap-3 border border-celeste bg-celeste-tint px-3 py-2 text-sm">
          <span>{d.board.importFromLink(pending.length)}</span>
          <button
            type="button"
            className="chip"
            onClick={() => {
              setFollows(pending);
              setPending(null);
              set({ follow: null });
            }}
          >
            {d.board.replace}
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => {
              merge(pending);
              setPending(null);
              set({ follow: null });
            }}
          >
            {d.board.merge}
          </button>
          <button
            type="button"
            className="chip"
            onClick={() => {
              setPending(null);
              set({ follow: null });
            }}
          >
            {d.board.ignore}
          </button>
        </div>
      )}

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title={d.board.follows}
          aside={
            follows.length > 0 ? (
              <span className="flex items-center gap-3">
                <Flash text={shareMsg} />
                <button type="button" className="link text-xs" onClick={share}>
                  {d.board.share}
                </button>
              </span>
            ) : undefined
          }
        >
          <FollowList
            locale={locale}
            ctx={ctx}
            suggestions={suggestions}
            compact
            removable
            onRemoved={(key, name) => {
              setRemoved({ key, name });
              setShareMsg(null);
            }}
          />
          {(removed || compareLinks.length > 0) && (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs">
              {removed && (
                <Flash
                  text={d.board.removed(removed.name)}
                  undo={d.board.undo}
                  onUndo={() => {
                    merge([removed.key]);
                    setRemoved(null);
                  }}
                />
              )}
              {compareLinks.length > 0 && <span className="text-muted">{d.board.compareFollowed}:</span>}
              {compareLinks.map(({ g, ks }) => (
                <AppLink key={g} className="link" href={routes.compare(locale, ks)}>
                  {d.pos[g]} ({ks.length})
                </AppLink>
              ))}
            </p>
          )}
        </Panel>

        <Panel title={d.board.notes} aside={<span className="num font-mono text-xs">{notes.length}</span>}>
          {notes.length === 0 ? (
            <p className="py-2 text-sm text-ink-2">{d.board.notesEmpty}</p>
          ) : (
            <div className="flex flex-col">
              {removedNote && (
                <p className="py-2 text-xs">
                  <Flash
                    text={d.board.noteRemoved}
                    undo={d.board.undo}
                    onUndo={() => {
                      addNote({
                        player_key: removedNote.player_key,
                        text: removedNote.text,
                        verdict: removedNote.verdict,
                        match_key: removedNote.match_key,
                        match_label: removedNote.match_label,
                        date: removedNote.date,
                      });
                      setRemovedNote(null);
                    }}
                  />
                </p>
              )}
              {[...byPlayer.entries()].map(([k, ns]) => (
                <div key={k}>
                  <h3 className="flex items-baseline gap-2 border-b border-rule-strong pb-0.5 pt-3 font-mono text-[11px] font-medium uppercase tracking-wide text-muted">
                    <AppLink className="link" href={routes.player(locale, k)}>
                      {names.get(k)?.n ?? k}
                    </AppLink>
                    {names.get(k)?.t && <span className="normal-case tracking-normal">{names.get(k)!.t}</span>}
                  </h3>
                  <NoteList
                    notes={ns.map((n) => ({ id: n.id, date: n.date, text: n.text, verdict: n.verdict, match: n.match_key, matchLabel: n.match_label }))}
                    labels={noteLabels(locale)}
                    onEdit={edit}
                    onRemove={(id) => {
                      const n = notes.find((x) => x.id === id) ?? null;
                      removeNote(id);
                      setRemovedNote(n);
                    }}
                    formatDate={(iso) => fmtDate(locale, iso)}
                  />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm">
        <button type="button" className="chip" onClick={doExport}>
          {d.board.export}
        </button>
        <button type="button" className="chip" onClick={() => file.current?.click()}>
          {d.board.import}
        </button>
        <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && doImport(e.target.files[0])} />
        <Hint text={d.board.warning} />
        <Flash text={ioMsg} />
        <span className="num ml-auto font-mono text-xs text-muted">{d.board.counts(follows.length, notes.length)}</span>
      </div>
    </>
  );
}
