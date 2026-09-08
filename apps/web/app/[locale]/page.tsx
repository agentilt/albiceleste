import { Panel, SquadSheet, Tag } from "@albiceleste/ui";
import { getPool, getRound, getWindows, inWatch, manifest, weekIndex, type RoundRow } from "@albiceleste/data";
import { FollowList } from "@/components/FollowList";
import { FollowStar } from "@/components/FollowStar";
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
  const [pool, windows, ctx] = await Promise.all([getPool(), getWindows(), eventContext()]);
  const last7 = await getRound(addDays(m.data_as_of, -6), 7);
  const watch = last7.filter(inWatch);
  const best = watch
    .filter((r) => r.apps > 0)
    .sort((a, b) => weekIndex(b) - weekIndex(a))
    .slice(0, 7);
  const worry: { r: RoundRow; line: string }[] = [
    ...watch
      .filter((r) => r.category === "did_not_play")
      .sort((a, b) => Number(b.in_last_squad) - Number(a.in_last_squad) || (a.pos_rank ?? 999) - (b.pos_rank ?? 999))
      .map((r) => ({ r, line: r.infirmary_reason ? `${d.infirmary[r.infirmary_reason]} · ${fmtDate(locale, pool.find((p) => p.player_key === r.player_key)?.last_match_date, false)}` : d.home.week.unused(r.team_matches) })),
    ...watch
      .filter((r) => r.category === "played" && r.minutes < 30 && (r.minutes_share ?? 0) >= 0.5)
      .sort((a, b) => (a.pos_rank ?? 999) - (b.pos_rank ?? 999))
      .map((r) => ({ r, line: d.home.week.short(r.minutes, r.team_matches) })),
  ].slice(0, 7);
  const watchPlayed = watch.filter((r) => r.apps > 0).length;
  const watchClubPlayed = watch.filter((r) => r.team_matches > 0).length;

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
        <Panel title={d.home.week.best} aside={d.home.week.last7}>
          <ol className="text-xs">
            {best.map((r) => {
              const cs = r.pos_group === "GK" || r.pos_group === "DEF" ? r.matches.filter((x) => x.played && (x.is_home ? x.away_score : x.home_score) === 0).length : 0;
              const last = [...r.matches].reverse().find((x) => x.played);
              const facts = [
                r.goals > 0 ? `${r.goals} G` : null,
                r.assists > 0 ? `${r.assists} A` : null,
                cs > 0 ? d.home.week.cleanSheet(cs) : null,
                `${r.minutes}′${r.apps > 1 ? ` · ${r.apps} ${d.common.matches}` : ""}`,
                last ? `${last.home_team} ${last.home_score ?? ""}–${last.away_score ?? ""} ${last.away_team}` : null,
              ].filter(Boolean);
              return (
                <li key={r.player_key} className="flex flex-wrap items-baseline gap-x-2 border-b border-rule py-1 leading-snug last:border-b-0">
                  <AppLink className="link font-medium" href={routes.player(locale, r.player_key)}>
                    {r.full_name}
                  </AppLink>
                  <span className="text-muted">{r.team}</span>
                  {r.in_last_squad && <Tag tone="accent">{d.marks.lastSquadShort}</Tag>}
                  <span className="text-ink-2">{facts.join(" · ")}</span>
                </li>
              );
            })}
          </ol>
        </Panel>
        <Panel title={d.home.week.worry} aside={d.home.week.last7}>
          {worry.length === 0 ? (
            <p className="text-xs text-muted">{d.home.week.none}</p>
          ) : (
            <ol className="text-xs">
              {worry.map(({ r, line }) => (
                <li key={r.player_key} className="flex flex-wrap items-baseline gap-x-2 border-b border-rule py-1 leading-snug last:border-b-0">
                  <AppLink className="link font-medium" href={routes.player(locale, r.player_key)}>
                    {r.full_name}
                  </AppLink>
                  <span className="text-muted">{r.team}</span>
                  {r.in_last_squad && <Tag tone="accent">{d.marks.lastSquadShort}</Tag>}
                  <span className="text-ink-2">{line}</span>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
      <p className="mb-4 text-xs text-muted">
        {d.home.week.roundLine(watchPlayed, watchClubPlayed)} · {d.home.week.watch} ·{" "}
        <AppLink className="link" href={routes.round(locale)}>
          {d.round.homeAll} →
        </AppLink>
      </p>

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
