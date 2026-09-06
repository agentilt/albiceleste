import { Field } from "@albiceleste/ui";

export const Select = () => (
  <Field label="Min severity">
    <select defaultValue={2}>
      <option value={1}>1</option>
      <option value={2}>2</option>
      <option value={3}>3</option>
    </select>
  </Field>
);

export const NumberInput = () => (
  <Field label="Min minutes">
    <input type="number" min={0} step={90} defaultValue={270} className="w-20" />
  </Field>
);

export const Row = () => (
  <div className="flex flex-wrap items-center gap-5">
    <Field label="Max age">
      <input type="number" min={16} max={45} defaultValue={23} className="w-16" />
    </Field>
    <Field label="Min minutes">
      <input type="number" min={0} step={90} defaultValue={0} className="w-20" />
    </Field>
    <label className="flex items-center gap-2">
      <input type="checkbox" defaultChecked />
      <span>include players under review</span>
    </label>
  </div>
);
