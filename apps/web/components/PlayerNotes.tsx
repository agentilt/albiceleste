"use client";

import { NoteComposer, NoteList, type NoteLabels, StaticTable } from "@albiceleste/ui";
import type { MatchLine } from "@albiceleste/data";
import { useState } from "react";
import { fmtDate, fmtDec, fmtInt } from "@/lib/fmt";
import { t, type Locale } from "@/lib/i18n";
import { useNotes } from "@/lib/store";

export function noteLabels(locale: Locale): NoteLabels {
  const n = t(locale).notes;
  return {
    placeholder: n.placeholder,
    save: n.save,
    cancel: n.cancel,
    edit: n.edit,
    remove: n.remove,
    verdictNone: n.verdictNone,
    verdicts: n.verdicts,
  };
}

/** The player's note trail with the compose box. Match notes appear here too, labelled with their match. */
export function PlayerNotesSection({ playerKey, locale }: { playerKey: string; locale: Locale }) {
  const { forPlayer, add, edit, remove } = useNotes();
  const labels = noteLabels(locale);
  const notes = forPlayer(playerKey);
  return (
    <div className="max-w-3xl">
      <NoteComposer labels={labels} onSave={(text, verdict) => add({ player_key: playerKey, text, verdict })} />
      <div className="mt-4">
        <NoteList
          notes={notes.map((n) => ({
            id: n.id,
            date: n.date,
            text: n.text,
            verdict: n.verdict,
            match: n.match_key,
            matchLabel: n.match_label,
          }))}
          labels={labels}
          onEdit={edit}
          onRemove={remove}
          formatDate={(iso) => fmtDate(locale, iso)}
        />
      </div>
    </div>
  );
}

/** Recent matches with a note affordance per row; a match note shows under its row. */
export function RecentMatches({ matches, playerKey, locale }: { matches: MatchLine[]; playerKey: string; locale: Locale }) {
  const d = t(locale);
  const { notes, add } = useNotes();
  const [open, setOpen] = useState<string | null>(null);
  const labels = noteLabels(locale);
  const byMatch = new Map<string, typeof notes>();
  for (const n of notes) if (n.player_key === playerKey && n.match_key) byMatch.set(n.match_key, [...(byMatch.get(n.match_key) ?? []), n]);
  const label = (r: MatchLine) => `${fmtDate(locale, r.match_date, false)} ${r.home_team_name} ${r.home_score ?? ""}–${r.away_score ?? ""} ${r.away_team_name}`;
  return (
    <>
      <StaticTable
        rows={matches}
        rowKey={(r) => r.match_key}
        empty={d.common.empty}
        caption={d.player.recent}
        cols={[
          {
            label: d.common.date,
            render: (r) => fmtDate(locale, r.match_date, false),
          },
          {
            label: d.common.match,
            maxWidth: "18rem",
            render: (r) => `${r.home_team_name} ${r.home_score ?? ""}–${r.away_score ?? ""} ${r.away_team_name}`,
          },
          {
            label: d.common.competition,
            priority: 3,
            maxWidth: "10rem",
            render: (r) => r.competition_name,
          },
          {
            label: d.player.roleCol,
            priority: 2,
            render: (r) => (r.is_starter ? d.player.role.start : r.played ? d.player.role.sub : d.player.role.bench),
          },
          {
            label: d.common.min,
            align: "r",
            render: (r) => fmtInt(locale, r.minutes_played),
          },
          {
            label: d.common.goals,
            align: "r",
            render: (r) => fmtInt(locale, r.goals),
          },
          {
            label: d.common.assists,
            align: "r",
            priority: 2,
            render: (r) => fmtInt(locale, r.assists),
          },
          {
            label: "xG",
            align: "r",
            priority: 3,
            render: (r) => fmtDec(locale, r.xg),
          },
          {
            label: d.common.rating,
            align: "r",
            priority: 2,
            render: (r) => fmtDec(locale, r.match_rating, 1),
          },
          {
            label: "",
            render: (r) => {
              const n = byMatch.get(r.match_key) ?? [];
              const isOpen = open === r.match_key;
              return (
                <button
                  type="button"
                  className={`hit text-xs ${n.length || isOpen ? "text-celeste-deep" : "text-muted hover:text-ink"}`}
                  aria-label={d.player.noteOnMatch}
                  title={d.player.noteOnMatch}
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : r.match_key)}
                >
                  ✎{n.length ? ` ${n.length}` : ""}
                </button>
              );
            },
          },
        ]}
      />
      {open && (
        <div className="mt-3 max-w-2xl border-l-2 border-celeste pl-3">
          <p className="mb-2 text-xs text-muted">{label(matches.find((m) => m.match_key === open)!)}</p>
          {(byMatch.get(open) ?? []).map((n) => (
            <p key={n.id} className="mb-2 text-sm">
              <span className="font-mono text-xs text-muted">{fmtDate(locale, n.date)}</span> {n.text}
            </p>
          ))}
          <NoteComposer
            labels={labels}
            onCancel={() => setOpen(null)}
            onSave={(text, verdict) => {
              const m = matches.find((x) => x.match_key === open)!;
              add({
                player_key: playerKey,
                match_key: open,
                match_label: label(m),
                text,
                verdict,
              });
              setOpen(null);
            }}
          />
        </div>
      )}
    </>
  );
}
