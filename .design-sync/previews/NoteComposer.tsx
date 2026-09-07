import { NoteComposer, type NoteLabels } from "@albiceleste/ui";

export const LABELS: NoteLabels = {
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

export const Empty = () => (
  <div className="max-w-xl">
    <NoteComposer labels={LABELS} onSave={() => {}} />
  </div>
);

export const Editing = () => (
  <div className="max-w-xl">
    <NoteComposer labels={LABELS} onSave={() => {}} onCancel={() => {}} initial={{ text: "Muy bien contra el Everton: 90 minutos, líder de la línea. Ver cómo responde ante el City.", verdict: "convocar" }} />
  </div>
);
