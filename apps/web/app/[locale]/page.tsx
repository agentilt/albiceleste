import { Figure, Panel, SquadSheet, Tag } from "@albiceleste/ui";
import { currentWeekStart, getMovers, getMoversBetween, getPool, getRound, getWeeks, getWindows, inRoundScope, manifest } from "@albiceleste/data";
import { FollowList } from "@/components/FollowList";
import { FollowStar } from "@/components/FollowStar";
import { MoverLine } from "@/components/MoverLine";
import { countdown, today } from "@/lib/countdown";
import { eventContext } from "@/lib/ctx";
import { fmtDate } from "@/lib/fmt";
import { t, windowLabel } from "@/lib/i18n";
import { AppLink } from "@/lib/link";
import { localeParams, readLocale } from "@/lib/params";
import { routes } from "@/lib/routes";

export function generateStaticParams() {
  return localeParams();
}

const GROUPS = ["GK", "DEF", "MID", "FWD"] as const;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const m = manifest();
  const [pool, windows, movers, ctx, week] = await Promise.all([getPool(), getWindows(), getMovers(), eventContext(), currentWeekStart()]);
  const [round, weeks] = await Promise.all([getRound(week), getWeeks()]);
  const thisWeek = weeks.find((w) => w.week_start === week);
  const scoped = round.filter(inRoundScope);
  const roundCounts = {
    played: scoped.filter((r) => r.category === "played").length,
    dnp: scoped.filter((r) => r.category === "did_not_play" && !r.infirmary_reason).length,
    out: scoped.filter((r) => r.infirmary_reason).length,
    of: scoped.length,
  };
  const roundStandouts = thisWeek ? await getMoversBetween(thisWeek.week_start, thisWeek.week_end, 3) : [];

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
  const top = (week7.length >= 5 ? week7 : week14).slice(0, 6);

  const infirmary = pool
    .filter((p) => p.infirmary_reason)
    .sort((a, b) => Number(b.in_last_squad) - Number(a.in_last_squad) || (a.pos_rank ?? 999) - (b.pos_rank ?? 999) || a.full_name.localeCompare(b.full_name));


  return (
    <>
      <div className="mb-12 grid gap-8 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)] lg:items-start">
        <div>
          <p className="mb-3 font-mono text-xs uppercase tracking-wide text-celeste-deep">{d.home.sheet.eyebrow}</p>
          <h1 className="text-4xl sm:text-5xl">{headline}</h1>
          <p className="mt-4 font-mono text-xs text-muted">
            <CountdownLine cd={cd} locale={locale} />
          </p>
          <p className="mt-6">
            <AppLink className="link font-medium" href={routes.pool(locale)}>
              {d.home.sheet.cta} →
            </AppLink>
          </p>
        </div>
        <SquadSheet columns={sheet} caption={d.home.sheet.caption} dense LinkComponent={AppLink} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title={d.round.homeTitle}
          aside={
            <AppLink className="link" href={routes.round(locale)}>
              {thisWeek ? `${fmtDate(locale, thisWeek.week_start, false)} – ${fmtDate(locale, thisWeek.week_end, false)}` : ""} · {d.round.homeAll} →
            </AppLink>
          }
        >
          <div className="grid grid-cols-3 gap-2">
            <Figure value={roundCounts.played} label={d.home.dash.played} />
            <Figure value={roundCounts.dnp} label={d.home.dash.dnp} />
            <Figure value={roundCounts.out} label={d.home.dash.out} />
          </div>
          <p className="mt-1 text-[11px] text-muted">{d.round.homeScope}</p>
          {roundStandouts.length > 0 && (
            <ol className="mt-2 border-t border-rule pt-1">
              {roundStandouts.map((x) => (
                <MoverLine key={x.event_key} m={x} locale={locale} ctx={ctx} compact />
              ))}
            </ol>
          )}
        </Panel>
        <Panel
          title={d.home.follow.title}
          aside={
            <AppLink className="link" href={routes.board(locale)}>
              {d.home.follow.manage} →
            </AppLink>
          }
        >
          <FollowList locale={locale} ctx={ctx} suggestions={suggestions} compact />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title={d.home.movers.title}
          aside={
            <AppLink className="link" href={routes.movers(locale)}>
              {d.home.movers.all} →
            </AppLink>
          }
        >
          {top.length === 0 ? (
            <p className="text-xs text-muted">{d.home.movers.none}</p>
          ) : (
            <ol>
              {top.map((x) => (
                <MoverLine key={x.event_key} m={x} locale={locale} ctx={ctx} compact />
              ))}
            </ol>
          )}
        </Panel>
        <Panel
          title={d.home.infirmary.title}
          aside={
            <AppLink className="link" href={routes.pool(locale, "?inf=1")}>
              {infirmary.length} · {d.home.infirmary.all} →
            </AppLink>
          }
        >
          {infirmary.length === 0 ? (
            <p className="text-xs text-muted">{d.home.infirmary.none}</p>
          ) : (
            <ol className="text-xs">
              {infirmary.slice(0, 6).map((p) => (
                <li key={p.player_key} className="flex flex-wrap items-baseline gap-x-2 border-b border-rule py-1 leading-snug last:border-b-0">
                  <AppLink className="link font-medium" href={routes.player(locale, p.player_key)}>
                    {p.full_name}
                  </AppLink>
                  {p.in_last_squad && <Tag tone="accent">{d.marks.lastSquadShort}</Tag>}
                  <span className="text-muted">
                    {d.infirmary[p.infirmary_reason!]} · {fmtDate(locale, p.last_match_date, false)} · {d.home.infirmary.missed(p.team_matches_missed)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
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
