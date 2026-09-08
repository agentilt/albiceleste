import type { Role } from "@albiceleste/data";

/** The eleven pitch slots, in depth-chart order. Mirrored here so client components never import the data runtime. */
export const ROLES: Role[] = ["GK", "RB", "CB", "LB", "DM", "CM", "AM", "RW", "LW", "ST"];

/** The slot a player falls to when the source has no sub-position: the natural centre of his group. */
export const ROLE_OF_GROUP: Record<string, Role> = { GK: "GK", DEF: "CB", MID: "CM", FWD: "ST" };
