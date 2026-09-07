import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CallStrip, LineChart, MinutesTimeline, Note, RankArrow, RankHistory, Section, StateWord, StaticTable, Tag } from "@albiceleste/ui";
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
import { posLabel, stateLabel, stateTone } from "@/lib/state";

export const dynamicParams = false;

function pretty(id: string | null): string {
  if (!id) return DASH;
  return id.replace(/-/g, " ").replace(/\b(\w)/g, (m) => m.toUpperCase()).replace(/\bUefa\b/, "UEFA").replace(/\bFa\b/, "FA");
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
  const horizon = manifest().data_as_of;
  const { player: p, seasons, matches, form, events, history, transfers, valuations } = page;
  const s = extra.state;
  const f28 = form.find((x) => x.window_days === 28);

  const meta = [
    p.current_team_name ? `${p.current_team_name}${p.current_competition ? `, ${p.current_competition}` : ""}` : null,
    p.primary_position ?? null,
    p.age !== null ? `${p.age}` : null,
    p.eligibility_status === "review" ? d.marks.review : null,
  ].filter(Boolean);

  const announced = extra.windows.filter((w) => w.announcement_date && w.announcement_date <= horizon && w.listed > 0);
  const lastWindow = announced[announced.length - 1] ?? null;
  const callMarks = extra.windows.map((w) => {
    const c = extra.calls.find((x) => x.window_id === w.window_id);
    const published = !!w.announcement_date && w.announcement_date <= horizon && w.listed > 0;
    return { id: w.window_id, label: windowLabel(locale, w), status: published ? ((c?.status as "called" | undefined) ?? null) : undefined };
  });
  const windowMarks = announced.map((w) => ({ date: w.announcement_date!, label: windowLabel(locale, w) }));
  const callDates = extra.calls.map((c) => extra.windows.find((w) => w.window_id === c.window_id)?.announcement_date).filter((x): x is string => !!x);

  const chron = [...matches].reverse().filter((m) => m.played || m.minutes_played > 0);
  const horizonRank = extra.rank_history[extra.rank_history.length - 1];
  const per90 = horizonRank && (horizonRank.minutes ?? 0) >= 90 ? Math.round(((((horizonRank.goals ?? 0) + 0.7 * (horizonRank.assists ?? 0)) * 90) / horizonRank.minutes!) * 100) / 100 : null;
  const firstAbroad = transfers.find((x) => x.to_country && x.to_country !== "Argentina");
  const posSize = s?.pos_size ?? null;

  return (
    <>
      <div className="mb-8">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
          <h1 className="text-5xl">{p.full_name}</h1>
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
      </div>

      <Section title={d.player.why}>
        {!s || s.state === "retired" ? (
          <p className="text-sm text-ink-2">{s?.state === "retired" ? d.player.whyRetired : DASH}</p>
        ) : s.pos_rank === null ? (
          <p className="text-sm text-ink-2">{d.player.whyNone}</p>
        ) : (
          <div className="max-w-3xl text-sm leading-relaxed text-ink-2">
            <p className="font-medium text-ink">{d.player.rankLine(s.pos_rank, posSize ?? 0, posLabel(d, s.pos_group).toLowerCase())}</p>
            <ul className="mt-2 space-y-1">
              <li>{d.player.components.minutes(shareToPct(s.minutes_share) ?? 0, shareToPct(s.season_minutes_share))}</li>
              <li>{d.player.components.starts(shareToPct(s.starts_share) ?? 0, s.season_team_matches ? Math.round((100 * (s.season_starts ?? 0)) / s.season_team_matches) : null)}</li>
              <li>{d.player.components.competition(p.current_competition ?? p.current_league ?? "?", s.level_rank ?? 3)}</li>
              <li>{s.pos_group === "GK" || s.pos_group === "DEF" ? d.player.components.productionDef(s.production ?? 0, s.season_clean_sheets, s.season_conceded) : d.player.components.productionAtt(per90, s.ga_per90)}</li>
            </ul>
            <p className="mt-2">
              <AppLink className="link" href={routes.compare(locale, [p.player_key])}>
                {d.player.compareFrom} →
              </AppLink>
            </p>
          </div>
        )}
      </Section>

      <Section title={d.player.selection}>
        <div className="flex flex-col gap-2 text-sm text-ink-2">
          {lastWindow && <p className="text-ink">{s?.in_last_squad ? d.player.inLastList(windowLabel(locale, lastWindow)) : d.player.notInLastList(windowLabel(locale, lastWindow))}</p>}
          <p className="flex flex-wrap items-center gap-3">
            <CallStrip marks={callMarks} />
            <span className="text-xs text-muted">{extra.windows.map((w) => windowLabel(locale, w)).join(" · ")}</span>
          </p>
          <p>
            {[
              p.tm_international_caps !== null && p.tm_international_caps > 0 ? d.player.caps(p.tm_international_caps) : null,
              p.first_arg_senior_cap_date ? d.player.firstCap(fmtDate(locale, p.first_arg_senior_cap_date)) : null,
              p.has_arg_youth_cap ? d.player.youth : null,
              p.has_other_senior_cap ? d.player.otherNation(p.other_senior_teams ?? "?") : null,
            ]
              .filter(Boolean)
              .join(" · ") || DASH}
          </p>
          {extra.trajectory?.dual_national_untied && <p className="text-gold">{d.player.dualUntied((p.citizenships ?? []).join(", "))}</p>}
          {extra.nt_status && (
            <p className="text-danger">
              {d.state.retired}
              {extra.nt_status.since ? ` · ${fmtDate(locale, extra.nt_status.since)}` : ""}
            </p>
          )}
        </div>
      </Section>

      <Section title={d.player.form} aside={f28 ? d.player.last28(f28.minutes, f28.prev_minutes) : undefined}>
        {chron.length > 0 ? (
          <>
            <h3 className="mb-1 text-sm text-muted">{d.player.minutesPerMatch}</h3>
            <MinutesTimeline points={chron.map((m) => ({ date: m.match_date, minutes: m.minutes_played, starter: m.is_starter }))} markers={windowMarks} />
            <Note>{d.player.minutesNote}</Note>
          </>
        ) : (
          <p className="text-sm text-muted">{DASH}</p>
        )}
        {extra.rank_history.some((r) => r.pos_rank !== null) && (
          <div className="mt-6">
            <h3 className="mb-1 text-sm text-muted">{d.player.rankHistory}</h3>
            <RankHistory points={extra.rank_history.map((r) => ({ date: r.as_of, rank: r.pos_rank }))} windows={windowMarks} calls={callDates} maxRank={Math.min(posSize ?? 60, 60)} />
            <Note>{d.player.rankNote}</Note>
          </div>
        )}
      </Section>

      <Section title={d.player.seasonLines}>
        <StaticTable
          rows={seasons}
          rowKey={(r) => `${r.league}-${r.season_year}`}
          empty={DASH}
          cols={[
            { label: d.common.season, render: (r) => String(r.season_year) },
            { label: d.common.competition, render: (r) => r.competition_name ?? r.league },
            { label: d.common.apps, align: "r", render: (r) => fmtInt(locale, r.appearances) },
            { label: d.common.starts, align: "r", render: (r) => fmtInt(locale, r.starts) },
            { label: d.common.minutes, align: "r", render: (r) => fmtInt(locale, r.minutes) },
            { label: d.common.goals, align: "r", render: (r) => fmtInt(locale, r.goals) },
            { label: d.common.assists, align: "r", render: (r) => fmtInt(locale, r.assists) },
            { label: d.common.per90, align: "r", render: (r) => (r.minutes >= 90 ? fmtDec(locale, ((r.goals + 0.7 * r.assists) * 90) / r.minutes) : DASH) },
            { label: "xG", align: "r", render: (r) => fmtDec(locale, r.xg) },
            { label: "xA", align: "r", render: (r) => fmtDec(locale, r.xa) },
            { label: d.common.rating, align: "r", render: (r) => fmtDec(locale, r.avg_rating) },
          ]}
        />
        <div className="mt-6">
          <h3 className="mb-2 text-base">{d.player.recent}</h3>
          <RecentMatches matches={matches.slice(0, 25)} playerKey={p.player_key} locale={locale} />
        </div>
      </Section>

      <Section title={d.player.events}>
        {events.length === 0 ? (
          <p className="text-sm text-muted">{DASH}</p>
        ) : (
          <ol className="max-w-3xl text-sm">
            {events.slice(0, 30).map((e) => (
              <li key={e.event_key} className="grid grid-cols-[5.5rem_1fr] gap-x-3 border-b border-rule py-1.5">
                <span className="font-mono text-xs text-muted">{fmtDate(locale, e.event_date, false)}</span>
                <span className="text-ink-2">{renderEvent(locale, e.event_type, e.evidence, ctx)}</span>
              </li>
            ))}
          </ol>
        )}
      </Section>

      <div className="grid gap-10 lg:grid-cols-2">
        <Section title={d.player.career}>
          <StaticTable
            rows={history}
            rowKey={(r, i) => `${r.season}-${i}`}
            empty={DASH}
            cols={[
              { label: d.common.season, render: (r) => `${r.season}/${String(r.season + 1).slice(2)}` },
              { label: d.common.club, render: (r) => r.club_name ?? DASH },
              { label: d.common.competition, render: (r) => pretty(r.competition_name) },
              { label: d.common.apps, align: "r", render: (r) => fmtInt(locale, r.appearances) },
              { label: d.common.min, align: "r", render: (r) => fmtInt(locale, r.minutes) },
              { label: d.common.goals, align: "r", render: (r) => fmtInt(locale, r.goals) },
              { label: d.common.assists, align: "r", render: (r) => fmtInt(locale, r.assists) },
            ]}
          />
          {firstAbroad && firstAbroad.age_at_transfer !== null && <Note>{d.player.exportContext(firstAbroad.age_at_transfer, `${firstAbroad.to_club_name ?? "?"}${firstAbroad.to_country ? ` (${firstAbroad.to_country})` : ""}`)}</Note>}
        </Section>
        <Section title={d.player.transfers}>
          <StaticTable
            rows={transfers}
            rowKey={(r, i) => `${r.transfer_date}-${i}`}
            empty={DASH}
            cols={[
              { label: d.common.date, render: (r) => fmtDate(locale, r.transfer_date) },
              { label: "→", render: (r) => `${r.from_club_name ?? DASH} → ${r.to_club_name ?? DASH}${r.to_country ? ` (${r.to_country})` : ""}` },
              { label: "€", align: "r", render: (r) => fmtEur(locale, r.transfer_fee_eur) },
              { label: d.common.value, align: "r", render: (r) => fmtEur(locale, r.market_value_eur) },
              { label: d.common.age, align: "r", render: (r) => fmtInt(locale, r.age_at_transfer) },
            ]}
          />
          {valuations.length > 1 && (
            <div className="mt-6">
              <h3 className="mb-2 text-base">
                {d.player.marketValue} <span className="text-sm text-muted">{fmtEur(locale, p.market_value_eur)}</span>
              </h3>
              <LineChart points={valuations.map((v) => ({ x: v.valuation_date, y: v.market_value_eur }))} format={(v) => fmtEur(locale, v)} yLabel="market value" />
            </div>
          )}
        </Section>
      </div>

      <Section title={d.player.notes} aside={d.player.notesLede}>
        <PlayerNotesSection playerKey={p.player_key} locale={locale} />
      </Section>

      <Note>
        {p.dob ? `${d.player.born} ${fmtDate(locale, p.dob)}${p.place_of_birth ? `, ${p.place_of_birth}` : ""}. ` : ""}
        {p.height_cm ? `${d.player.height} ${p.height_cm} cm. ` : ""}
        {p.identity_source} · {p.eligibility_basis ?? DASH}
      </Note>
    </>
  );
}
