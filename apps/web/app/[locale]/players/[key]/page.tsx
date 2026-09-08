import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { type CallMark, CallStrip, Disclosure, Figure, Hint, LineChart, MinutesTimeline, Panel, PanelRows, RankArrow, RankHistory, Section, StateWord, StaticTable, Tag } from "@albiceleste/ui";
import { getPlayerExtra, getPlayerKeys, getPlayerPage, manifest } from "@albiceleste/data";
import { FollowStar, NoteCount } from "@/components/FollowStar";
import { PlayerNotesSection, RecentMatches } from "@/components/PlayerNotes";
import { eventContext } from "@/lib/ctx";
import { renderEvent } from "@/lib/events";
import { DASH, fmtDate, fmtDec, fmtEur, fmtInt, shareToPct } from "@/lib/fmt";
import { t, windowLabel } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { readLocale } from "@/lib/params";
import { routes } from "@/lib/routes";
import { stateLabel, stateTone } from "@/lib/state";

export const dynamicParams = false;

function pretty(id: string | null): string {
  if (!id) return DASH;
  return id
    .replace(/-/g, " ")
    .replace(/\b(\w)/g, (m) => m.toUpperCase())
    .replace(/\bUefa\b/, "UEFA")
    .replace(/\bFa\b/, "FA");
}

/** Heights arrive in metres from one source and centimetres from another. */
function heightCm(h: number | null): number | null {
  if (h === null || h <= 0) return null;
  return h < 3 ? Math.round(h * 100) : Math.round(h);
}

export async function generateStaticParams() {
  const keys = await getPlayerKeys();
  return keys.map((key) => ({ key }));
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string; key: string }> }): Promise<Metadata> {
  const { key } = await params;
  const page = await getPlayerPage(decodeURIComponent(key));
  return { title: page?.player.full_name ?? "Player" };
}

export default async function PlayerPage({ params }: { params: Promise<{ locale: string; key: string }> }) {
  const locale = await readLocale(params);
  const { key: raw } = await params;
  const key = decodeURIComponent(raw);
  const [page, extra, ctx] = await Promise.all([getPlayerPage(key), getPlayerExtra(key), eventContext()]);
  if (!page) notFound();
  const d = t(locale);
  const tag = locale === "es" ? "es-AR" : "en-GB";
  const horizon = manifest().data_as_of;
  const { player: p, seasons, matches, form, events, history, transfers, valuations } = page;
  const s = extra.state;
  const f28 = form.find((x) => x.window_days === 28);
  const group = s?.pos_group ?? "UNK";
  const isDef = group === "GK" || group === "DEF";

  const meta = [
    p.current_team_name ? `${p.current_team_name}${p.current_competition ? `, ${p.current_competition}` : ""}` : null,
    (d.posOne as Record<string, string>)[group],
    p.age !== null ? `${p.age}` : null,
    p.eligibility_status === "review" ? d.marks.review : null,
  ].filter(Boolean);
  const cm = heightCm(p.height_cm);
  const facts = [
    p.dob ? `${d.player.born} ${fmtDate(locale, p.dob)}${p.place_of_birth ? `, ${p.place_of_birth}` : ""}` : null,
    cm ? `${cm} cm` : null,
    d.player.source[p.identity_source] ?? p.identity_source,
    p.eligibility_basis ? (d.player.basis[p.eligibility_basis] ?? p.eligibility_basis) : null,
  ].filter(Boolean);

  const announced = extra.windows.filter((w) => w.announcement_date && w.announcement_date <= horizon && w.listed > 0);
  const lastWindow = announced[announced.length - 1] ?? null;
  const callMarks = extra.windows.map((w) => {
    const c = extra.calls.find((x) => x.window_id === w.window_id);
    const published = !!w.announcement_date && w.announcement_date <= horizon && w.listed > 0;
    return {
      id: w.window_id,
      label: windowLabel(locale, w),
      status: published ? ((c?.status as CallMark["status"]) ?? null) : undefined,
    };
  });
  const calledCount = callMarks.filter((m) => m.status && m.status !== "withdrew").length;
  const windowMarks = announced.map((w) => ({
    date: w.announcement_date!,
    label: windowLabel(locale, w),
  }));
  const callDates = extra.calls.map((c) => extra.windows.find((w) => w.window_id === c.window_id)?.announcement_date).filter((x): x is string => !!x);

  const chron = [...matches].reverse().filter((m) => m.played || m.minutes_played > 0);
  const hasRankHistory = extra.rank_history.some((r) => r.pos_rank !== null);
  const horizonRank = extra.rank_history[extra.rank_history.length - 1];
  const per90 = horizonRank && (horizonRank.minutes ?? 0) >= 90 ? Math.round(((((horizonRank.goals ?? 0) + 0.7 * (horizonRank.assists ?? 0)) * 90) / horizonRank.minutes!) * 100) / 100 : null;
  const firstAbroad = transfers.find((x) => x.to_country && x.to_country !== "Argentina");
  const posSize = s?.pos_size ?? null;
  const pct = (v: number | null | undefined) => (v === null || v === undefined ? DASH : `${v}%`);

  // the ranking panel: the four components as rows, the sentences behind the "?"
  const ranked = s && s.state !== "retired" && s.pos_rank !== null;
  const why = ranked
    ? [
        d.player.components.minutes(shareToPct(s.minutes_share) ?? 0, shareToPct(s.season_minutes_share)),
        d.player.components.starts(shareToPct(s.starts_share) ?? 0, s.season_team_matches ? Math.round((100 * (s.season_starts ?? 0)) / s.season_team_matches) : null),
        d.player.components.competition(p.current_competition ?? p.current_league ?? "?", s.level_rank ?? 3),
        isDef ? d.player.components.productionDef(s.production ?? 0, s.season_clean_sheets, s.season_conceded) : d.player.components.productionAtt(per90, s.ga_per90),
      ].join(" ")
    : undefined;
  const whyRows = ranked
    ? [
        {
          key: "minutes",
          left: d.player.rows.minutes,
          right: `${pct(shareToPct(s.minutes_share))} · ${d.player.seasonShort} ${pct(shareToPct(s.season_minutes_share))}`,
        },
        {
          key: "starts",
          left: d.player.rows.starts,
          right: `${pct(shareToPct(s.starts_share))} · ${d.player.seasonShort} ${pct(s.season_team_matches ? Math.round((100 * (s.season_starts ?? 0)) / s.season_team_matches) : null)}`,
        },
        {
          key: "competition",
          left: d.player.rows.competition,
          right: `${p.current_competition ?? p.current_league ?? DASH} · ${d.player.tierShort(s.level_rank ?? 3)}`,
        },
        {
          key: "production",
          left: d.player.rows.production,
          right: isDef
            ? `${Math.round((s.production ?? 0) * 100)}/100 · ${fmtInt(locale, s.season_clean_sheets)} ${d.common.cleanSheets} · ${fmtInt(locale, s.season_conceded)} ${d.common.conceded}`
            : `${per90 === null ? DASH : fmtDec(locale, per90)} ${d.common.per90} · ${d.player.seasonShort} ${s.ga_per90 === null ? DASH : fmtDec(locale, s.ga_per90)}`,
        },
      ]
    : [];

  const selectionRaw: ({ key: string; left: ReactNode; right?: ReactNode } | null)[] = [
    lastWindow
      ? { key: "last", left: `${d.player.sel.last} · ${windowLabel(locale, lastWindow)}`, right: s?.in_last_squad ? <span className="text-celeste-deep">{d.player.sel.in}</span> : d.player.sel.out }
      : null,
    {
      key: "caps",
      left: d.player.sel.caps,
      right:
        p.tm_international_caps !== null && p.tm_international_caps > 0
          ? `${fmtInt(locale, p.tm_international_caps)}${p.first_arg_senior_cap_date ? ` · ${d.player.sel.first} ${p.first_arg_senior_cap_date.slice(0, 4)}` : ""}`
          : p.first_arg_senior_cap_date
            ? `${d.player.sel.first} ${p.first_arg_senior_cap_date.slice(0, 4)}`
            : DASH,
    },
    p.has_arg_youth_cap ? { key: "youth", left: d.player.sel.youth, right: d.player.sel.yes } : null,
    p.has_other_senior_cap ? { key: "other", left: d.player.sel.other, right: p.other_senior_teams ?? "?" } : null,
    extra.trajectory?.dual_national_untied
      ? { key: "dual", left: d.player.sel.dual, right: <span className="text-gold-deep">{`${(p.citizenships ?? []).join(", ")} · ${d.player.sel.dualNote}`}</span> }
      : null,
    extra.nt_status ? { key: "nt", left: <span className="text-danger">{d.player.sel.retired}</span>, right: extra.nt_status.since ? fmtDate(locale, extra.nt_status.since) : undefined } : null,
  ];
  const selectionRows = selectionRaw.filter((r) => r !== null);

  return (
    <>
      <div className="mb-6">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="text-4xl xl:text-5xl">{p.full_name}</h1>
          {s && (
            <span className="flex items-baseline gap-2 text-base">
              <StateWord label={stateLabel(d, s.state, s.infirmary_reason)} tone={stateTone(s.state)} />
              {s.pos_rank && (
                <span className="font-mono text-sm text-muted">
                  {d.posShort[s.pos_group as "GK"]} {s.pos_rank}
                </span>
              )}
              <RankArrow change={s.rank_change} className="text-sm" />
              {s.in_last_squad && <Tag tone="accent">{d.marks.lastSquad}</Tag>}
            </span>
          )}
          <span className="ml-auto flex items-baseline gap-3">
            <FollowStar playerKey={p.player_key} locale={locale} compact={false} />
            <NoteCount playerKey={p.player_key} locale={locale} />
          </span>
        </div>
        <p className="mt-2 text-ink-2">{meta.join(" · ")}</p>
        {s?.infirmary_reason && s.last_match_date && (
          <p className="mt-1 text-sm text-danger">{d.player.availability(d.infirmary[s.infirmary_reason], fmtDate(locale, s.last_match_date), s.team_matches_missed)}</p>
        )}
        {facts.length > 0 && <p className="mt-1 font-mono text-xs text-muted">{facts.join(" · ")}</p>}
      </div>

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        <Panel
          title={d.player.rankTitle}
          hint={why}
          hintHref={routes.about(locale, "#ranking")}
          aside={ranked ? <span className="num font-mono text-xs">{d.player.rankOf(s.pos_rank!, posSize ?? 0)}</span> : undefined}
        >
          {ranked ? <PanelRows rows={whyRows} /> : <p className="py-2 text-sm text-ink-2">{s?.state === "retired" ? d.player.whyRetired : s ? d.player.whyNone : DASH}</p>}
          <p className="mt-auto py-2 text-xs">
            <AppLink className="link" href={routes.compare(locale, [p.player_key])}>
              {d.player.compareFrom} →
            </AppLink>
          </p>
        </Panel>

        <Panel title={d.player.selection} aside={<span className="num font-mono text-xs">{d.player.listsCalled(calledCount, announced.length)}</span>}>
          <div className="flex min-h-9 items-center gap-3 border-b border-rule">
            <CallStrip marks={callMarks} statusLabels={d.player.callStatus} notCalled={d.player.notCalled} pending={d.player.pending} />
          </div>
          <PanelRows rows={selectionRows} />
        </Panel>

        {s && (
          <Panel title={d.player.seasonLines} aside={f28 ? <span className="num font-mono text-xs">{d.player.last28Short(f28.minutes, f28.prev_minutes)}</span> : undefined}>
            <div className="grid flex-1 grid-cols-4 items-center gap-3 py-2">
              <Figure value={fmtInt(locale, s.season_apps)} label={d.common.apps} />
              <Figure value={fmtInt(locale, s.season_starts)} label={d.common.starts} />
              <Figure value={fmtInt(locale, s.season_minutes)} label={d.common.minutes} />
              {isDef ? (
                <Figure value={fmtInt(locale, s.season_clean_sheets)} label={d.common.cleanSheets} />
              ) : (
                <Figure value={fmtInt(locale, (s.season_goals ?? 0) + (s.season_assists ?? 0))} label={d.common.per90.replace("/90", "")} />
              )}
            </div>
          </Panel>
        )}
      </div>

      {(chron.length > 0 || hasRankHistory) && (
        <Section title={d.player.form}>
          {chron.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-1 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wide text-muted">
                {d.player.minutesPerMatch}
                <Hint text={d.player.minutesNote} />
              </h3>
              <MinutesTimeline
                points={chron.map((m) => ({
                  date: m.match_date,
                  minutes: m.minutes_played,
                  starter: m.is_starter,
                }))}
                markers={windowMarks}
                locale={tag}
                label={d.player.minutesPerMatch}
                narrow={360}
                empty={DASH}
              />
            </div>
          )}
          {hasRankHistory && (
            <div>
              <h3 className="mb-1 flex items-center gap-2 font-mono text-[11px] font-medium uppercase tracking-wide text-muted">
                {d.player.rankHistory}
                <Hint text={d.player.rankNote} />
              </h3>
              <RankHistory
                points={extra.rank_history.map((r) => ({
                  date: r.as_of,
                  rank: r.pos_rank,
                }))}
                windows={windowMarks}
                calls={callDates}
                maxRank={Math.min(posSize ?? 60, 60)}
                locale={tag}
                label={d.player.rankHistory}
                narrow={360}
                empty={DASH}
              />
            </div>
          )}
        </Section>
      )}

      {(seasons.length > 0 || matches.length > 0) && (
        <Section title={d.player.recent} aside={seasons.length > 0 ? undefined : undefined}>
          {seasons.length > 0 && (
            <div className="mb-6">
              <StaticTable
                rows={seasons}
                rowKey={(r) => `${r.league}-${r.season_year}`}
                empty={DASH}
                caption={d.player.seasonLines}
                cols={[
                  {
                    label: d.common.season,
                    render: (r) => String(r.season_year),
                  },
                  {
                    label: d.common.competition,
                    render: (r) => r.competition_name ?? r.league,
                    maxWidth: "12rem",
                  },
                  {
                    label: d.common.apps,
                    align: "r",
                    render: (r) => fmtInt(locale, r.appearances),
                  },
                  {
                    label: d.common.starts,
                    align: "r",
                    priority: 2,
                    render: (r) => fmtInt(locale, r.starts),
                  },
                  {
                    label: d.common.minutes,
                    align: "r",
                    render: (r) => fmtInt(locale, r.minutes),
                  },
                  {
                    label: d.common.goals,
                    align: "r",
                    render: (r) => fmtInt(locale, r.goals),
                  },
                  {
                    label: d.common.assists,
                    align: "r",
                    render: (r) => fmtInt(locale, r.assists),
                  },
                  {
                    label: d.common.per90,
                    align: "r",
                    priority: 2,
                    render: (r) => (r.minutes >= 90 ? fmtDec(locale, ((r.goals + 0.7 * r.assists) * 90) / r.minutes) : DASH),
                  },
                  {
                    label: "xG",
                    align: "r",
                    priority: 3,
                    render: (r) => fmtDec(locale, r.xg),
                  },
                  {
                    label: "xA",
                    align: "r",
                    priority: 3,
                    render: (r) => fmtDec(locale, r.xa),
                  },
                  {
                    label: d.common.rating,
                    align: "r",
                    priority: 3,
                    render: (r) => fmtDec(locale, r.avg_rating),
                  },
                ]}
              />
            </div>
          )}
          {matches.length > 0 && <RecentMatches matches={matches.slice(0, 25)} playerKey={p.player_key} locale={locale} />}
        </Section>
      )}

      {events.length > 0 && (
        <Disclosure title={d.player.events} aside={<span className="num">{events.length}</span>} open={events.length <= 6}>
          <ol className="max-w-3xl text-sm">
            {events.slice(0, 40).map((e) => (
              <li key={e.event_key} className="grid grid-cols-[5.5rem_1fr] gap-x-3 border-b border-rule py-1.5">
                <span className="font-mono text-xs text-muted">{fmtDate(locale, e.event_date, false)}</span>
                <span className="text-ink-2">{renderEvent(locale, e.event_type, e.evidence, ctx)}</span>
              </li>
            ))}
          </ol>
        </Disclosure>
      )}

      {(history.length > 0 || transfers.length > 0 || valuations.length > 1) && (
        <div className="grid gap-x-10 lg:grid-cols-2">
          {history.length > 0 && (
            <Disclosure
              title={d.player.career}
              aside={
                firstAbroad && firstAbroad.age_at_transfer !== null
                  ? d.player.exportContext(firstAbroad.age_at_transfer, `${firstAbroad.to_club_name ?? "?"}${firstAbroad.to_country ? ` (${firstAbroad.to_country})` : ""}`)
                  : undefined
              }
            >
              <StaticTable
                rows={history}
                rowKey={(r, i) => `${r.season}-${i}`}
                empty={DASH}
                caption={d.player.career}
                cols={[
                  {
                    label: d.common.season,
                    render: (r) => `${r.season}/${String(r.season + 1).slice(2)}`,
                  },
                  {
                    label: d.common.club,
                    render: (r) => r.club_name ?? DASH,
                    maxWidth: "11rem",
                  },
                  {
                    label: d.common.competition,
                    priority: 2,
                    maxWidth: "10rem",
                    render: (r) => pretty(r.competition_name),
                  },
                  {
                    label: d.common.apps,
                    align: "r",
                    render: (r) => fmtInt(locale, r.appearances),
                  },
                  {
                    label: d.common.min,
                    align: "r",
                    priority: 2,
                    render: (r) => fmtInt(locale, r.minutes),
                  },
                  {
                    label: d.common.goals,
                    align: "r",
                    render: (r) => fmtInt(locale, r.goals),
                  },
                  {
                    label: d.common.assists,
                    align: "r",
                    render: (r) => fmtInt(locale, r.assists),
                  },
                ]}
              />
            </Disclosure>
          )}
          {(transfers.length > 0 || valuations.length > 1) && (
            <Disclosure title={d.player.transfers} aside={p.market_value_eur ? `${d.player.marketValue} ${fmtEur(locale, p.market_value_eur)}` : undefined}>
              {transfers.length > 0 && (
                <StaticTable
                  rows={transfers}
                  rowKey={(r, i) => `${r.transfer_date}-${i}`}
                  empty={DASH}
                  caption={d.player.transfers}
                  cols={[
                    {
                      label: d.common.date,
                      render: (r) => fmtDate(locale, r.transfer_date),
                    },
                    {
                      label: "→",
                      render: (r) => `${r.from_club_name ?? DASH} → ${r.to_club_name ?? DASH}${r.to_country ? ` (${r.to_country})` : ""}`,
                      maxWidth: "16rem",
                    },
                    {
                      label: "€",
                      align: "r",
                      render: (r) => fmtEur(locale, r.transfer_fee_eur),
                    },
                    {
                      label: d.common.value,
                      align: "r",
                      priority: 2,
                      render: (r) => fmtEur(locale, r.market_value_eur),
                    },
                    {
                      label: d.common.age,
                      align: "r",
                      priority: 2,
                      render: (r) => fmtInt(locale, r.age_at_transfer),
                    },
                  ]}
                />
              )}
              {valuations.length > 1 && (
                <div className="mt-4">
                  <LineChart
                    points={valuations.map((v) => ({
                      x: v.valuation_date,
                      y: v.market_value_eur,
                    }))}
                    format={(v) => fmtEur(locale, v)}
                    yLabel={d.player.marketValue}
                    locale={tag}
                    narrow={340}
                    empty={DASH}
                  />
                </div>
              )}
            </Disclosure>
          )}
        </div>
      )}

      <Section title={d.player.notes} hint={d.player.notesLede}>
        <PlayerNotesSection playerKey={p.player_key} locale={locale} />
      </Section>
    </>
  );
}
