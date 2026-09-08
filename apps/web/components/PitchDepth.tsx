"use client";

import { Hint, PitchField, RankArrow, StateWord, Tag } from "@albiceleste/ui";
import type { PoolRow, Role } from "@albiceleste/data";
import { ROLE_OF_GROUP, ROLES } from "@/lib/roles";
import { useMemo } from "react";
import { FollowStar } from "@/components/FollowStar";
import { t, type Locale } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { routes } from "@/lib/routes";
import { stateLabel, stateTone } from "@/lib/state";
import { useFollows } from "@/lib/store";
import { useUrlState } from "@/lib/urlstate";

/** Slot geometry on the 3:4 pitch, attacking upwards: centre (x, y) in percent, how many names the box shows. */
const SLOTS: { role: Role; x: number; y: number; deep: number; wide?: boolean }[] = [
  { role: "LW", x: 17, y: 13, deep: 3 },
  { role: "ST", x: 50, y: 11, deep: 3 },
  { role: "RW", x: 83, y: 13, deep: 3 },
  { role: "AM", x: 50, y: 28, deep: 3 },
  { role: "CM", x: 50, y: 45, deep: 4, wide: true },
  { role: "DM", x: 50, y: 61, deep: 3 },
  { role: "LB", x: 17, y: 75, deep: 3 },
  { role: "CB", x: 50, y: 78, deep: 4, wide: true },
  { role: "RB", x: 83, y: 75, deep: 3 },
  { role: "GK", x: 50, y: 92, deep: 3 },
];

function shortName(full: string): string {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return full;
  return `${parts[0]![0]}. ${parts.slice(1).join(" ")}`;
}

/** The pitch depth chart: eleven slots, each with the best-ranked players who play it; a side list for the chosen slot. */
export function PitchDepth({ rows, locale }: { rows: PoolRow[]; locale: Locale }) {
  const d = t(locale);
  const { get, set } = useUrlState();
  const { follows } = useFollows();
  const picked = get("slot") as Role | null;
  const selected = picked && ROLES.includes(picked) ? picked : null;

  const bySlot = useMemo(() => {
    const m = new Map<Role, { r: PoolRow; guessed: boolean }[]>();
    for (const role of ROLES) m.set(role, []);
    for (const r of rows) {
      const role = r.role ?? ROLE_OF_GROUP[r.pos_group] ?? null;
      if (!role) continue;
      m.get(role)!.push({ r, guessed: r.role === null });
    }
    for (const list of m.values()) list.sort((a, b) => (a.r.pos_rank ?? 9999) - (b.r.pos_rank ?? 9999) || a.r.full_name.localeCompare(b.r.full_name));
    return m;
  }, [rows]);
  const noRole = rows.filter((r) => r.role === null).length;
  const roles = d.pool.roles as Record<Role, string>;

  const line = ({ r, guessed }: { r: PoolRow; guessed: boolean }) => (
    <li key={r.player_key} className="flex min-h-9 min-w-0 items-center gap-3 border-b border-rule text-sm">
      <span className={`num w-7 shrink-0 text-right font-mono text-[11px] ${guessed ? "text-rule-strong" : "text-muted"}`} title={guessed ? d.pool.roleGuessed : undefined}>
        {r.pos_rank ?? "–"}
      </span>
      <RankArrow change={r.rank_change} className="w-8 shrink-0 text-xs" />
      <span className="flex min-w-0 flex-1 items-baseline gap-2 whitespace-nowrap">
        <AppLink className="link shrink-0 font-medium" href={routes.player(locale, r.player_key)}>
          {r.full_name}
        </AppLink>
        <span className="min-w-0 truncate text-muted">{r.team_short ?? r.team}</span>
        {r.in_last_squad && (
          <span className="shrink-0">
            <Tag tone="accent">{d.marks.lastSquadShort}</Tag>
          </span>
        )}
      </span>
      <span className="hidden shrink-0 sm:inline">
        <StateWord label={stateLabel(d, r.state, r.infirmary_reason)} tone={stateTone(r.state)} />
      </span>
      <FollowStar playerKey={r.player_key} locale={locale} />
    </li>
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,34rem)_minmax(0,1fr)]">
      {/* the pitch from `sm` up */}
      <div className="hidden sm:block">
        <PitchField>
          {SLOTS.map((s) => {
            const list = bySlot.get(s.role) ?? [];
            const active = selected === s.role;
            return (
              <button
                key={s.role}
                type="button"
                aria-pressed={active}
                aria-label={`${roles[s.role]} · ${list.length}`}
                onClick={() => set({ slot: active ? null : s.role })}
                className={`absolute -translate-x-1/2 -translate-y-1/2 border bg-surface px-2 py-1 text-left shadow-sm ${active ? "border-ink ring-1 ring-ink" : "border-rule-strong hover:border-ink-2"}`}
                style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.wide ? "34%" : "27%" }}
              >
                <span className="flex items-baseline justify-between gap-2 border-b border-celeste pb-0.5 font-mono text-[10px] uppercase tracking-wide text-muted">
                  <span className="truncate">{roles[s.role]}</span>
                  <span className="num">{list.length}</span>
                </span>
                <ol className="mt-0.5">
                  {list.slice(0, s.deep).map(({ r, guessed }) => (
                    <li key={r.player_key} className="condensed flex items-baseline gap-1 whitespace-nowrap text-xs leading-5">
                      <span className={`num w-4 shrink-0 font-mono text-[10px] ${guessed ? "text-rule-strong" : "text-muted"}`}>{r.pos_rank ?? "–"}</span>
                      <span className={`min-w-0 truncate ${follows.includes(r.player_key) ? "font-medium text-ink" : "text-ink-2"}`}>{shortName(r.full_name)}</span>
                      {r.in_last_squad && (
                        <span className="shrink-0 text-[9px] text-celeste-deep" aria-hidden="true">
                          ●
                        </span>
                      )}
                    </li>
                  ))}
                  {list.length === 0 && <li className="text-xs text-rule-strong">—</li>}
                </ol>
              </button>
            );
          })}
        </PitchField>
        <p className="mt-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-wide text-muted">
          <span className="text-celeste-deep">●</span> {d.marks.lastSquad}
          <span className="ml-3 text-rule-strong">12</span> {d.pool.roleGuessed}
          {noRole > 0 && <span className="ml-auto normal-case tracking-normal">{d.pool.noRole(noRole)}</span>}
          <Hint text={d.pool.pitchHint} />
        </p>
      </div>

      {/* the side list: the chosen slot in full; on a phone every slot as a section */}
      <div className="min-w-0">
        {selected ? (
          <section>
            <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-rule-strong pb-1">
              <h3 className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-wide text-ink">
                <span className="stripe" aria-hidden="true" style={{ width: "0.75rem", height: "0.75rem" }} />
                {roles[selected]}
              </h3>
              <span className="num font-mono text-xs text-muted">{(bySlot.get(selected) ?? []).length}</span>
            </div>
            <ol>{(bySlot.get(selected) ?? []).map(line)}</ol>
          </section>
        ) : (
          <p className="hidden py-2 text-sm text-muted sm:block">{d.pool.pickSlot}</p>
        )}
        <div className="sm:hidden">
          {SLOTS.filter((s) => s.role !== selected).map((s) => (
            <section key={s.role} className="mb-4">
              <div className="mb-1 flex items-baseline justify-between gap-3 border-b border-rule-strong pb-1 font-mono text-[11px] uppercase tracking-wide text-muted">
                <span>{roles[s.role]}</span>
                <span className="num">{(bySlot.get(s.role) ?? []).length}</span>
              </div>
              <ol>{(bySlot.get(s.role) ?? []).slice(0, s.deep).map(line)}</ol>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
