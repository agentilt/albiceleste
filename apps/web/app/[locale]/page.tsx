import { Panel, PanelRows, SquadSheet, Tag } from "@albiceleste/ui";
import { cleanSheets, getPool, getRound, getSeasonToDate, getSquadLists, getWindows, inWatch, manifest, seasonIndex, seasonStart, weekIndex, type PoolRow, type RoundRow } from "@albiceleste/data";
import { FollowList } from "@/components/FollowList";
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
type Group = (typeof GROUPS)[number];

function addDays(ymd: string, n: number): string {
  const [y, m, dd] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y!, m! - 1, dd! + n)).toISOString().slice(0, 10);
}

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const m = manifest();
  const [pool, windows, squads, ctx] = await Promise.all([getPool(), getWindows(), getSquadLists(), eventContext()]);
  const [last7, season] = await Promise.all([getRound(addDays(m.data_as_of, -6), 7), getSeasonToDate()]);
  const byKey = new Map(pool.map((p) => [p.player_key, p]));
  const seasonOf = new Map(season.map((r) => [r.player_key, r]));
  const since = fmtDate(locale, seasonStart(m.data_as_of), false);

  // the headline: where the calendar stands
  const cd = countdown(windows, today());
  const headline =
    cd.kind === "before"
      ? d.home.sheet.headline(cd.days, cd.expected)
      : cd.kind === "announced" || cd.kind === "in_window"
        ? d.home.sheet.headlineWindow(windowLabel(locale, cd.window))
        : cd.kind === "next_only"
          ? d.home.countdown.nextWindowOnly(windowLabel(locale, cd.window), fmtDate(locale, cd.window.starts, false), fmtDate(locale, cd.window.ends))
          : d.home.sheet.headlineNone;
  const metaBits: string[] = [];
  if (cd.kind === "before" && cd.window.announcement_date) metaBits.push(d.home.countdown.announcementOn(fmtDate(locale, cd.window.announcement_date, false), cd.expected));
  if (cd.kind !== "none") metaBits.push(d.home.countdown.window(fmtDate(locale, cd.window.starts, false), fmtDate(locale, cd.window.ends, false)));
  metaBits.push(d.home.sheet.dataTo(fmtDate(locale, m.data_as_of, false)));

  // the last list, with the season behind each name
  const lastWindow = [...windows].reverse().find((w) => w.announcement_date && w.announcement_date <= m.data_as_of && w.listed > 0) ?? null;
  const lastRows = lastWindow ? squads.filter((s) => s.window_id === lastWindow.window_id) : [];
  const isDef = (g: string) => g === "GK" || g === "DEF";
  const stats = (p: PoolRow | undefined, g: string) => {
    const r = p ? seasonOf.get(p.player_key) : undefined;
    return !r ? "" : `${r.apps} · ${isDef(g) ? cleanSheets(r) : r.goals + r.assists}`;
  };
  const nameOf = (p: PoolRow | undefined, g: string, fallback: string, key: string | null) => ({
    key: key ?? fallback,
    name: p?.full_name ?? fallback,
    href: key ? routes.player(locale, key) : undefined,
    club: p?.team_short ?? p?.team ?? null,
    rank: p?.pos_rank ?? null,
    stats: p && p.state !== "retired" && p.state !== "out" ? stats(p, g) : undefined,
    note: p && (p.state === "retired" || p.state === "out") ? d.state[p.state] : undefined,
  });
  const squadCols = GROUPS.map((g) => {
    const rows = lastRows.filter((s) => s.pos_group === g).map((s) => ({ s, p: s.player_key ? byKey.get(s.player_key) : undefined }));
    rows.sort((a, b) => (a.p?.pos_rank ?? 999) - (b.p?.pos_rank ?? 999) || a.s.player_name.localeCompare(b.s.player_name));
    return { title: d.pos[g], slots: rows.length, hint: isDef(g) ? d.home.sheet.hintDef : d.home.sheet.hintAtt, names: rows.map(({ s, p }) => nameOf(p, g, s.player_name, s.player_key)) };
  });
  const lastKeys = new Set(lastRows.map((s) => s.player_key).filter(Boolean));

  // the challengers: best of the season per position, on the watch, outside the last list
  const challengerCols = GROUPS.map((g) => {
    const rows = pool
      .filter((p) => p.pos_group === g && p.in_watch && !lastKeys.has(p.player_key) && p.state !== "out" && p.state !== "retired" && (seasonOf.get(p.player_key)?.minutes ?? 0) > 0)
      .sort((a, b) => seasonIndex(seasonOf.get(b.player_key)!, b.level_rank) - seasonIndex(seasonOf.get(a.player_key)!, a.level_rank))
      .slice(0, 3);
    return { title: d.pos[g], slots: 3, hint: isDef(g) ? d.home.sheet.hintDef : d.home.sheet.hintAtt, names: rows.map((p) => nameOf(p, g, p.full_name, p.player_key)) };
  });

  // the week on the watch
  const watch = last7.filter(inWatch);
  const best = watch
    .filter((r) => r.apps > 0)
    .sort((a, b) => weekIndex(b) - weekIndex(a))
    .slice(0, 7);
  const worry: { r: RoundRow; line: string }[] = [
    ...watch
      .filter((r) => r.category === "did_not_play")
      .sort((a, b) => Number(b.in_last_squad) - Number(a.in_last_squad) || (a.pos_rank ?? 999) - (b.pos_rank ?? 999))
      .map((r) => ({ r, line: r.infirmary_reason ? `${d.infirmary[r.infirmary_reason]} · ${fmtDate(locale, byKey.get(r.player_key)?.last_match_date, false)}` : d.home.week.unused(r.team_matches) })),
    ...watch
      .filter((r) => r.category === "played" && r.minutes < 30 && (r.minutes_share ?? 0) >= 0.5)
      .sort((a, b) => (a.pos_rank ?? 999) - (b.pos_rank ?? 999))
      .map((r) => ({ r, line: d.home.week.short(r.minutes, r.team_matches) })),
  ].slice(0, 7);

  const ranked = pool.filter((p) => p.pos_rank !== null);
  const suggestions = GROUPS.flatMap((g) => ranked.filter((p) => p.pos_group === g).slice(0, 1)).slice(0, 3).map((p) => ({ key: p.player_key, name: p.full_name }));

  const who = (r: RoundRow) => (
    <>
      <AppLink className="link font-medium" href={routes.player(locale, r.player_key)}>
        {r.full_name}
      </AppLink>
      <span className="text-muted"> {byKey.get(r.player_key)?.team_short ?? r.team}</span>
      {r.in_last_squad && (
        <>
          {" "}
          <Tag tone="accent">{d.marks.lastSquadShort}</Tag>
        </>
      )}
    </>
  );

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-8 gap-y-3">
        <div>
          <p className="mb-2 font-mono text-xs uppercase tracking-wide text-celeste-deep">{d.home.sheet.eyebrow}</p>
          <h1 className="text-4xl xl:text-5xl">{headline}</h1>
        </div>
        <div className="max-w-md font-mono text-sm leading-relaxed text-muted lg:text-right">
          <p>{metaBits.join(" · ")}</p>
          <p className="mt-1">
            <AppLink className="link" href={routes.pool(locale)}>
              {d.home.sheet.cta} →
            </AppLink>
          </p>
        </div>
      </div>

      <div className="mb-4">
        <SquadSheet
          title={lastWindow ? d.home.sheet.lastList(windowLabel(locale, lastWindow)) : d.home.sheet.challengers}
          aside={lastWindow ? `${lastRows.length} · ${fmtDate(locale, lastWindow.announcement_date)}` : undefined}
          columns={lastWindow ? squadCols : challengerCols}
          hint={lastWindow ? d.home.sheet.lastListCaption(since) : d.home.sheet.challengersCaption(since)}
          hintHref={routes.about(locale, "#home")}
          secondary={lastWindow ? { title: d.home.sheet.challengers, hint: d.home.sheet.challengersCaption(since), columns: challengerCols } : undefined}
          dense
          LinkComponent={AppLink}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title={d.home.week.best} hint={d.home.week.bestHint} hintHref={routes.about(locale, "#home")} aside={d.home.week.last7}>
          <PanelRows
            rows={best.map((r) => {
              const cs = isDef(r.pos_group) ? r.matches.filter((x) => x.played && (x.is_home ? x.away_score : x.home_score) === 0).length : 0;
              const last = [...r.matches].reverse().find((x) => x.played);
              // what matters first, so a tight row cuts the minutes, never the goals or the score
              const facts = [
                r.goals > 0 ? `${r.goals} G` : null,
                r.assists > 0 ? `${r.assists} A` : null,
                cs > 0 ? d.home.week.cleanSheet(cs) : null,
                last ? `${last.is_home ? d.common.vs : "@"} ${last.is_home ? last.away_team : last.home_team} ${last.is_home ? last.home_score : last.away_score}–${last.is_home ? last.away_score : last.home_score}` : null,
                `${r.minutes}′${r.apps > 1 ? ` · ${r.apps} ${d.common.matches}` : ""}`,
              ].filter(Boolean);
              return { key: r.player_key, left: who(r), right: facts.join(" · ") };
            })}
          />
        </Panel>
        <Panel
          title={d.home.week.worry}
          hint={d.home.week.worryHint}
          hintHref={routes.about(locale, "#home")}
          aside={
            <AppLink className="link" href={routes.round(locale)}>
              {d.round.homeAll} →
            </AppLink>
          }
        >
          {worry.length === 0 ? <p className="text-sm text-muted">{d.home.week.none}</p> : <PanelRows rows={worry.map(({ r, line }) => ({ key: r.player_key, left: who(r), right: line }))} />}
        </Panel>
      </div>

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
