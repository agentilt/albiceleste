import type { State, InfirmaryReason } from "@albiceleste/data";
import type { StateTone } from "@albiceleste/ui";
import type { Dict } from "./i18n";

export function stateTone(state: State | null | undefined): StateTone {
  switch (state) {
    case "out":
    case "retired":
      return "out";
    case "on_fire":
    case "established":
      return "strong";
    case "rising":
    case "back":
      return "up";
    case "declining":
    case "short_minutes":
      return "down";
    case "just_moved":
      return "new";
    default:
      return "quiet";
  }
}

export function stateLabel(d: Dict, state: State | null | undefined, reason?: InfirmaryReason | null): string {
  if (!state) return "";
  if (state === "out" && reason) return `${d.state.out} · ${d.infirmary[reason]}`;
  return d.state[state] ?? state;
}

export function posLabel(d: Dict, g: string | null | undefined): string {
  return (d.pos as Record<string, string>)[g ?? "UNK"] ?? d.pos.UNK;
}
