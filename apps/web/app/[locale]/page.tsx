import { Bars, Note, Section, SquadSheet, Tag } from "@albiceleste/ui";
import { currentWeekStart, getMovers, getMoversBetween, getPool, getPresence, getRound, getTrajectory, getWeekend, getWeeks, getWindows, inRoundScope, manifest } from "@albiceleste/data";
import { FollowList } from "@/components/FollowList";
import { FollowStar } from "@/components/FollowStar";
import { MoverLine } from "@/components/MoverLine";
import { countdown, today } from "@/lib/countdown";
import { eventContext } from "@/lib/ctx";
import { baDay, fmtDate, fmtDayHeading, fmtInt, fmtKickoff } from "@/lib/fmt";
import { t, windowLabel } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { localeParams, readLocale } from "@/lib/params";
import { routes } from "@/lib/routes";
import { stateLabel, stateTone } from "@/lib/state";

export function generateStaticParams() {
  return localeParams();
}

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const m = manifest();
  const [pool, windows, weekend, movers, trajectory, presence, ctx, week] = await Promise.all([
    getPool(),
    getWindows(),
    getWeekend(),
    getMovers(),
    getTrajectory(),
    getPresence(),
    eventContext(),
    currentWeekStart(),
  ]);
  const [round, weeks] = await Promise.all([getRound(week), getWeeks()]);
  const thisWeek = weeks.find((w) => w.week_start === week);
  const scoped = round.filter(inRoundScope);
  const roundCounts = {
    played: scoped.filter((r) => r.category === "played").length,
    dnp: scoped.filter((r) => r.category === "did_not_play" && !r.infirmary_reason).length,
    out: scoped.filter((r) => r.infirmary_reason).length,
    of: scoped.length,
  };
  const roundStandouts = thisWeek ? await getMoversBetween(thisWeek.week_start, thisWeek.week_end, 4) : [];

  const cd = countdown(windows, today());
  const ranked = pool.filter((p) => p.pos_rank !== null);
  const SLOTS: Record<(typeof GROUPS)[number], number> = { GK: 3, DEF: 9, MID: 8, FWD: 6 };
  const sheet = GROUPS.map((g) => ({
    title: d.pos[g],
    slots: SLOTS[g],
    names: ranked
      .filter((p) => p.pos_group === g && p.state !== "out" && p.state !== "retired")
      .slice(0, SLOTS[g])
      .map((p) => ({ key: p.player_key, name: p.full_name, href: routes.player(locale, p.player_key), club: p.team, rank: p.pos_rank, marked: p.in_last_squad })),
  }));
  const headline =
    cd.kind === "before" ? d.home.sheet.headline(cd.days, cd.expected) : cd.kind === "announced" || cd.kind === "in_window" ? d.home.sheet.headlineWindow(windowLabel(locale, cd.window)) : cd.kind === "next_only" ? d.home.countdown.nextWindowOnly(windowLabel(locale, cd.window), fmtDate(locale, cd.window.starts, false), fmtDate(locale, cd.window.ends)) : d.home.sheet.headlineNone;
  const suggestions = GROUPS.flatMap((g) => ranked.filter((p) => p.pos_group === g).slice(0, 1)).slice(0, 3).map((p) => ({ key: p.player_key, name: p.full_name }));

  const week7 = movers.filter((x) => x.event_date >= addDays(m.data_as_of, -7));
  const week14 = movers.filter((x) => x.event_date >= addDays(m.data_as_of, -14));
  const top = (week7.length >= 6 ? week7 : week14).slice(0, 6);

  const infirmary = pool
    .filter((p) => p.infirmary_reason)
    .sort((a, b) => Number(b.in_last_squad) - Number(a.in_last_squad) || (a.pos_rank ?? 999) - (b.pos_rank ?? 999) || a.full_name.localeCompare(b.full_name));

  const youngsters = trajectory.filter((x) => x.trajectory !== null).slice(0, 4);
  const retention = trajectory.filter((x) => x.dual_national_untied).length;

  const abroad = presence.filter((p) => p.country !== "Argentina");
  const home = presence.filter((p) => p.country === "Argentina");
  const nAbroad = pool.filter((p) => p.is_abroad).length;

  const days = new Map<string, typeof weekend>();
  for (const w of weekend) {
    const k = baDay(w.kickoff_utc);
    days.set(k, [...(days.get(k) ?? []), w]);
  }

  return (
    <>
      <div className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wide text-celeste-deep">{d.home.sheet.eyebrow}</p>
          <h1 className="text-4xl sm:text-5xl">{headline}</h1>
          <p className="mt-4 max-w-md text-base text-ink-2">{d.home.sheet.sub}</p>
          <p className="mt-4 font-mono text-xs text-muted">
            <CountdownLine cd={cd} locale={locale} />
          </p>
          <p className="mt-6">
            <AppLink className="link font-medium" href={routes.pool(locale)}>
              {d.home.sheet.cta} →
            </AppLink>
          </p>
        </div>
        <SquadSheet columns={sheet} caption={d.home.sheet.caption} LinkComponent={AppLink} />
      </div>

      <Section
        title={d.round.homeTitle}
        aside={
          <>
            {thisWeek ? `${d.round.week(fmtDate(locale, thisWeek.week_start, false), fmtDate(locale, thisWeek.week_end, false))} · ` : ""}
            <AppLink className="link" href={routes.round(locale)}>
              {d.round.homeAll} →
            </AppLink>
          </>
        }
      >
        <p className="text-sm text-ink">
          {d.round.homeLine(roundCounts.played, roundCounts.dnp, roundCounts.out, roundCounts.of)} <span className="text-muted">({d.round.homeScope})</span>
        </p>
        {roundStandouts.length > 0 && (
          <ol className="mt-2">
            {roundStandouts.map((x) => (
              <MoverLine key={x.event_key} m={x} locale={locale} ctx={ctx} />
            ))}
          </ol>
        )}
      </Section>

      <Section
        title={d.home.follow.title}
        aside={
          <AppLink className="link" href={routes.board(locale)}>
            {d.home.follow.manage} →
          </AppLink>
        }
      >
        <FollowList locale={locale} ctx={ctx} suggestions={suggestions} />
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section
          title={d.home.movers.title}
          aside={
            <AppLink className="link" href={routes.movers(locale)}>
              {d.home.movers.all} →
            </AppLink>
          }
        >
          {top.length === 0 ? (
            <p className="text-sm text-muted">{d.home.movers.none}</p>
          ) : (
            <ol>
              {top.map((x) => (
                <MoverLine key={x.event_key} m={x} locale={locale} ctx={ctx} />
              ))}
            </ol>
          )}
        </Section>

        <Section
          title={d.home.infirmary.title}
          aside={
            <AppLink className="link" href={routes.pool(locale, "?inf=1")}>
              {d.home.infirmary.all} →
            </AppLink>
          }
        >
          {infirmary.length === 0 ? (
            <p className="text-sm text-muted">{d.home.infirmary.none}</p>
          ) : (
            <ol className="text-sm">
              {infirmary.slice(0, 10).map((p) => (
                <li key={p.player_key} className="flex flex-wrap items-baseline gap-x-2 border-b border-rule py-2">
                  <AppLink className="link font-medium" href={routes.player(locale, p.player_key)}>
                    {p.full_name}
                  </AppLink>
                  <span className="text-muted">{p.team}</span>
                  <span className="text-ink-2">
                    {d.infirmary[p.infirmary_reason!]} {d.home.infirmary.since} {fmtDate(locale, p.last_match_date, false)} · {d.home.infirmary.missed(p.team_matches_missed)}
                  </span>
                  {p.in_last_squad && <Tag tone="accent">{d.marks.lastSquadShort}</Tag>}
                  {p.pos_rank && (
                    <span className="font-mono text-xs text-muted">
                      {d.posShort[p.pos_group as "GK"]} {p.pos_rank}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          )}
          <Note>{d.home.infirmary.aside}</Note>
        </Section>
      </div>

      <Section title={d.home.weekend.title} aside={d.common.kickoff}>
        {days.size === 0 ? (
          <p className="text-sm text-muted">{d.home.weekend.none}</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {[...days.entries()].map(([day, ms]) => (
              <div key={day}>
                <h3 className="mb-1 border-b border-rule-strong pb-1 font-sans text-xs font-medium uppercase tracking-wide text-muted">{fmtDayHeading(locale, day)}</h3>
                <ol className="text-sm">
                  {ms.map((w) => (
                    <li key={w.match_key} className="grid grid-cols-[3.25rem_1fr] gap-x-3 border-b border-rule py-1.5">
                      <span className="num font-mono text-xs text-muted">{fmtKickoff(locale, w.kickoff_utc, false)}</span>
                      <span className="min-w-0">
                        <span className="font-medium">
                          {w.home_team} – {w.away_team}
                        </span>
                        <span className="text-muted"> · {w.competition}</span>
                        <span className="block text-ink-2">
                          {w.players.slice(0, 6).map((p, i) => (
                            <span key={p.player_key}>
                              {i > 0 && ", "}
                              <AppLink className="link" href={routes.player(locale, p.player_key)}>
                                {p.full_name}
                              </AppLink>
                              {p.pos_rank && (
                                <span className="font-mono text-xs text-muted">
                                  {" "}
                                  {d.posShort[p.pos_group as "GK"]} {p.pos_rank}
                                </span>
                              )}
                            </span>
                          ))}
                          {w.players.length > 6 && <span className="text-muted"> {d.home.weekend.andMore(w.players.length - 6)}</span>}
                        </span>
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}
        <Note>{d.home.weekend.aside}</Note>
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section
          title={d.home.next.title}
          aside={
            <AppLink className="link" href={routes.next(locale)}>
              {d.home.next.all} →
            </AppLink>
          }
        >
          <ol className="text-sm">
            {youngsters.map((y) => (
              <li key={y.player_key} className="flex flex-wrap items-baseline gap-x-2 border-b border-rule py-2">
                <AppLink className="link font-medium" href={routes.player(locale, y.player_key)}>
                  {y.full_name}
                </AppLink>
                <span className="text-ink-2">
                  {y.age} · {y.team}
                  {y.competition ? `, ${y.competition}` : ""}
                </span>
                <span className="num ml-auto font-mono text-xs text-muted">
                  {d.next.trajectory.toLowerCase()} {y.trajectory?.toFixed(2)}
                </span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-ink-2">
            <AppLink className="link" href={`${routes.next(locale)}#retention`}>
              {d.home.next.retention(retention)}
            </AppLink>
          </p>
          <Note>{d.home.next.aside}</Note>
        </Section>

        <Section title={d.home.where.title} aside={d.home.where.abroad(nAbroad)}>
          <Bars data={abroad.map((p) => ({ label: p.competition, value: p.players }))} />
          {home.length > 0 && <Note>{d.home.where.domestic(home.reduce((s, p) => s + p.players, 0), home[0]!.competition)}</Note>}
        </Section>
      </div>
    </>
  );
}

function addDays(ymd: string, n: number): string {
  const [y, m, dd] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, dd! + n)).toISOString().slice(0, 10);
}

function CountdownLine({ cd, locale }: { cd: ReturnType<typeof countdown>; locale: "es" | "en" }) {
  const d = t(locale);
  const c = d.home.countdown;
  if (cd.kind === "none") return <>{c.noWindow}</>;
  const w = cd.window;
  const span = c.window(fmtDate(locale, w.starts, false), fmtDate(locale, w.ends));
  const lastLink = (last: typeof w | null) =>
    last ? (
      <>
        {" · "}
        {c.lastList}:{" "}
        <AppLink className="link" href={routes.pool(locale, "?squad=1")}>
          {windowLabel(locale, last)}
        </AppLink>
      </>
    ) : null;
  if (cd.kind === "before") {
    return (
      <>
        {c.announcementOn(fmtDate(locale, w.announcement_date, false), cd.expected)} · {span}
        {lastLink(cd.last)}
      </>
    );
  }
  if (cd.kind === "announced") {
    return (
      <>
        <AppLink className="link" href={routes.pool(locale, "?squad=1")}>
          {c.inWindow(windowLabel(locale, w), w.listed)}
        </AppLink>{" "}
        · {span}
      </>
    );
  }
  if (cd.kind === "in_window") {
    return (
      <>
        <AppLink className="link" href={routes.pool(locale, "?squad=1")}>
          {c.inWindow(windowLabel(locale, w), w.listed)}
        </AppLink>{" "}
        · {span}
        {w.matches_note ? ` · ${w.matches_note}` : ""}
      </>
    );
  }
  return <>{c.nextWindowOnly(windowLabel(locale, w), fmtDate(locale, w.starts, false), fmtDate(locale, w.ends))}</>;
}
