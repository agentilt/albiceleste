import { CallStrip } from "@albiceleste/ui";

const MARKS = [
  { id: "2026-wc", label: "Copa del Mundo 2026", status: "called" as const },
  { id: "2026-09", label: "Fecha FIFA septiembre-octubre 2026", status: undefined },
  { id: "2026-11", label: "Fecha FIFA noviembre 2026", status: undefined },
];

export const CalledOnce = () => <CallStrip marks={MARKS} />;
export const NeverCalled = () => <CallStrip marks={[{ id: "a", label: "Copa del Mundo 2026", status: null }, { id: "b", label: "Sept–oct 2026", status: undefined }]} />;
export const Withdrew = () => <CallStrip marks={[{ id: "a", label: "Copa América 2024", status: "called" }, { id: "b", label: "Oct 2024", status: "withdrew" }, { id: "c", label: "Nov 2024", status: null }, { id: "d", label: "Copa del Mundo 2026", status: "called" }]} />;
export const Small = () => <CallStrip marks={MARKS} size="sm" />;
export const WithLabels = () => (
  <span className="inline-flex items-center gap-3 text-xs text-muted">
    <CallStrip marks={MARKS} /> Copa del Mundo 2026 · Sept–oct 2026 · Nov 2026
  </span>
);
