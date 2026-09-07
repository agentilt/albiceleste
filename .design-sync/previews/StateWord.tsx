import { StateWord } from "@albiceleste/ui";

export const Strong = () => <StateWord label="Titular fijo" tone="strong" />;
export const Up = () => <StateWord label="En alza" tone="up" />;
export const Down = () => <StateWord label="En baja" tone="down" />;
export const Out = () => <StateWord label="En enfermería · ausente" tone="out" />;
export const New = () => <StateWord label="Recién llegado" tone="new" />;
export const Quiet = () => <StateWord label="Estable" />;
export const AllStates = () => (
  <div className="flex flex-wrap gap-4">
    <StateWord label="En racha" tone="strong" />
    <StateWord label="En alza" tone="up" />
    <StateWord label="En baja" tone="down" />
    <StateWord label="Poco rodaje" tone="down" />
    <StateWord label="Volvió" tone="up" />
    <StateWord label="Recién llegado" tone="new" />
    <StateWord label="Out" tone="out" />
    <StateWord label="Steady" />
  </div>
);
