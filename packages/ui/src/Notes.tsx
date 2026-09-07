"use client";

import { useState } from "react";

export interface NoteLike {
  id: string;
  date: string;
  text: string;
  verdict?: string | null;
  /** match key when the note is about one match */
  match?: string | null;
  matchLabel?: string | null;
}

export interface NoteLabels {
  placeholder: string;
  save: string;
  cancel: string;
  edit: string;
  remove: string;
  verdictNone: string;
  verdicts: { value: string; label: string }[];
}

/** Compose box: free text, an optional verdict, save. Controlled by the host through `onSave`. */
export function NoteComposer({ labels, onSave, initial, onCancel, autoFocus = false }: { labels: NoteLabels; onSave: (text: string, verdict: string | null) => void; initial?: { text: string; verdict: string | null }; onCancel?: () => void; autoFocus?: boolean }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [verdict, setVerdict] = useState<string | null>(initial?.verdict ?? null);
  return (
    <form
      className="flex flex-col gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onSave(text.trim(), verdict);
        if (!initial) {
          setText("");
          setVerdict(null);
        }
      }}
    >
      <textarea
        className="min-h-20 w-full border border-rule-strong bg-surface p-2 text-sm"
        placeholder={labels.placeholder}
        value={text}
        autoFocus={autoFocus}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="flex flex-wrap items-center gap-2">
        {labels.verdicts.map((v) => (
          <button key={v.value} type="button" className="chip" aria-pressed={verdict === v.value} onClick={() => setVerdict(verdict === v.value ? null : v.value)}>
            {v.label}
          </button>
        ))}
        <span className="ml-auto flex gap-2">
          {onCancel && (
            <button type="button" className="chip" onClick={onCancel}>
              {labels.cancel}
            </button>
          )}
          <button type="submit" className="chip" aria-pressed="true" disabled={!text.trim()}>
            {labels.save}
          </button>
        </span>
      </div>
    </form>
  );
}

/** Notes in date order with verdict tags; edit and remove in place. */
export function NoteList({ notes, labels, onEdit, onRemove, formatDate = (d) => d }: { notes: NoteLike[]; labels: NoteLabels; onEdit?: (id: string, text: string, verdict: string | null) => void; onRemove?: (id: string) => void; formatDate?: (iso: string) => string }) {
  const [editing, setEditing] = useState<string | null>(null);
  if (notes.length === 0) return null;
  return (
    <ol className="text-sm">
      {notes.map((n) => (
        <li key={n.id} className="border-b border-rule py-2">
          {editing === n.id && onEdit ? (
            <NoteComposer
              labels={labels}
              initial={{ text: n.text, verdict: n.verdict ?? null }}
              autoFocus
              onCancel={() => setEditing(null)}
              onSave={(t, v) => {
                onEdit(n.id, t, v);
                setEditing(null);
              }}
            />
          ) : (
            <>
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="font-mono text-xs text-muted">{formatDate(n.date)}</span>
                {n.verdict && <span className="font-mono text-[11px] uppercase tracking-wide text-celeste-deep">{labels.verdicts.find((v) => v.value === n.verdict)?.label ?? n.verdict}</span>}
                {n.matchLabel && <span className="text-xs text-muted">{n.matchLabel}</span>}
                <span className="ml-auto flex gap-3 text-xs">
                  {onEdit && (
                    <button type="button" className="link" onClick={() => setEditing(n.id)}>
                      {labels.edit}
                    </button>
                  )}
                  {onRemove && (
                    <button type="button" className="text-muted hover:text-danger" onClick={() => onRemove(n.id)}>
                      {labels.remove}
                    </button>
                  )}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{n.text}</p>
            </>
          )}
        </li>
      ))}
    </ol>
  );
}
