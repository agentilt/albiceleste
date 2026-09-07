import { NoteList, type NoteLabels } from "@albiceleste/ui";

const LABELS: NoteLabels = {
  placeholder: "Escribí una nota…",
  save: "Guardar",
  cancel: "Cancelar",
  edit: "Editar",
  remove: "Borrar",
  verdictNone: "sin veredicto",
  verdicts: [
    { value: "convocar", label: "Convocar" },
    { value: "seguir", label: "Seguir" },
    { value: "no", label: "No" },
  ],
};

const NOTES = [
  { id: "n1", date: "2026-09-07T10:12:00Z", text: "Muy bien contra el Everton: 90 minutos, líder de la línea. Ver cómo responde ante el City.", verdict: "convocar" },
  { id: "n2", date: "2026-08-22T18:40:00Z", text: "Primer partido tras la lesión. Sin ritmo todavía, pero la salida con pelota está intacta.", verdict: "seguir", matchLabel: "22 ago Hull City 2–0 Manchester United" },
  { id: "n3", date: "2026-05-30T09:00:00Z", text: "Convocado para el Mundial.", verdict: null },
];

export const Trail = () => (
  <div className="max-w-xl">
    <NoteList notes={NOTES} labels={LABELS} onEdit={() => {}} onRemove={() => {}} formatDate={(iso) => iso.slice(0, 10)} />
  </div>
);

export const ReadOnly = () => (
  <div className="max-w-xl">
    <NoteList notes={NOTES.slice(0, 2)} labels={LABELS} formatDate={(iso) => iso.slice(0, 10)} />
  </div>
);
