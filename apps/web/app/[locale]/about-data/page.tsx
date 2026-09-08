import type { Metadata } from "next";
import { Note, PageTitle, Section, StaticTable } from "@albiceleste/ui";
import { getAgreement, getCoverage, getMethodParameters, getPipelineRuns, getRawSummary, getSquadLists, getStatsBySource, getUnmatched, getWindows, manifest } from "@albiceleste/data";
import { DASH, fmtDate, fmtDateTime, fmtDec, fmtInt } from "@/lib/fmt";
import { t, windowLabel, type Locale } from "@/lib/i18n";
import { localeParams, readLocale } from "@/lib/params";
import { REPO_URL } from "@/lib/site";

export function generateStaticParams() {
  return localeParams();
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const locale = await readLocale(params);
  return { title: t(locale).about.title };
}

const COPY = {
  es: {
    what: [
      "albiceleste sigue a todos los jugadores elegibles para la Selección argentina mayor que están en un plantel de las catorce ligas cubiertas, partido a partido, y responde una sola pregunta: quién está en forma para la próxima lista, quién se está quedando afuera y quién golpea la puerta.",
      "No es un sitio de noticias, no tiene videos ni contratos, y no reemplaza el criterio de un cuerpo técnico. Todo número que muestra sale de un registro de fuente que se puede rastrear; todo lo que no está en los datos se dice que no está, en lugar de inventarse.",
      "Proyecto personal, sin relación con la AFA ni con ningún club. Solo datos gratuitos.",
    ],
    horizon: (asOf: string, exported: string) =>
      `El horizonte de datos es el último partido completo cargado: ${asOf}. La instantánea que ve el sitio se exportó el ${exported}. Las actualizaciones son manuales (una corrida de ingesta, el modelo de transformación, la exportación y la reconstrucción del sitio); no hay una programación automática, por decisión.`,
    sources: [
      ["Wikidata", "identidad, ciudadanías, partidos con selecciones (CC0)"],
      ["ESPN", "planteles, partidos, alineaciones y minutos por sustitución (endpoints internos, sin clave)"],
      ["Highlightly", "estadísticas de partido para las siete ligas originales (plan gratuito, cuota diaria)"],
      ["football-data.org", "partidos y planteles de las competencias europeas (plan gratuito)"],
      ["Transfermarkt", "historial de carrera, pases y valores de mercado desde la instantánea CC0 transfermarkt-datasets (hasta junio de 2026)"],
      ["FPL", "identificadores de la Premier League"],
    ],
    eligibility:
      "Elegible: ciudadanía argentina según Wikidata y sin partidos oficiales con otra selección mayor; o presencia en un plantel de la liga argentina (se asume elegible salvo dato en contra). En revisión: doble nacionalidad con señales ambiguas, o sin identidad en Wikidata. Solo juveniles: pasos por juveniles argentinos con partidos oficiales para otra selección mayor. Un partido oficial con Argentina cierra la puerta a otra federación, y viceversa.",
    matching:
      "Cada fuente tiene su propio identificador. El cruce se hace por nombre normalizado (sin acentos, minúsculas) más fecha de nacimiento o club cuando existe, con una tabla de correcciones a mano para los casos que fallan. Lo que no cruza queda en las tablas de calidad, no se descarta en silencio.",
    minutes:
      "Los minutos vienen de Highlightly cuando hay ficha del partido; si no, se derivan del reloj de sustituciones de ESPN (titular sin cambio = minutos del partido; entrada o salida = diferencia). La tabla de acuerdo compara ambas fuentes donde coinciden.",
    score: [
      "El ranking es la posición de un puntaje que nunca se muestra. Se calcula por jugador y por grupo de puesto en cada fecha de cálculo (todos los lunes desde agosto de 2024 más cada anuncio de lista), sobre los últimos diez partidos completos del equipo del jugador en su paso actual por el club (cambia de club: la ventana empieza de cero y no hay puntaje hasta tres partidos del equipo).",
      "Componentes en [0, 1]: cuota de minutos disponibles; cuota de titularidades; producción (goles más 0,7 asistencias cada 90 contra una referencia por puesto para mediocampistas y delanteros; vallas invictas y goles en contra para arqueros y defensores). Se ponderan por puesto (tabla) y el total se multiplica por el peso de la competencia (nivel 1: 1,00; nivel 2: 0,80; nivel 3: 0,60). La edad nunca entra.",
      "La flecha es el cambio de puesto en el ranking desde la fecha del último anuncio de lista (o 28 días si no hay uno reciente).",
    ],
    states:
      "Un estado por jugador, con prioridad: retirado; en enfermería (lesionado, suspendido o ausente); recién llegado (cambio de club en los últimos 30 días); volvió (regreso de una ausencia en los últimos 14 días); sin puesto o sin minutos; poco rodaje (sin puntaje por falta de partidos, o cuota de minutos menor a 40 %); en racha (puntaje de 55 o más y subida de 8 o más puntos en 28 días); en alza (subida de 8 o más); en baja (caída de 8 o más); titular fijo (puntaje de 50 o más, estable); estable.",
    infirmary:
      "Suspendido: expulsado en su último partido y el club no volvió a jugar. Ausente: un titular habitual (cuota de minutos de 40 % o más en la última fecha de cálculo antes de la ausencia) sin minutos en tres o más partidos de su club actual, sin ser recién llegado. Lesionado: nunca se activa, porque ESPN no publica listas de lesionados para fútbol; por eso el sitio dice “ausente desde”, no “lesionado”. La fecha es el último partido jugado.",
    trajectory:
      "Trayectoria = índice de actividad actual (cuota de minutos × peso de la competencia, sobre los últimos diez partidos del equipo) dividido por el percentil 75 de ese índice entre los jugadores del plantel a la misma edad en toda la historia disponible (con un piso de 0,10). El percentil de edad es la proporción de observaciones de la misma edad con índice igual o menor. La camada: 23 años o menos al horizonte, elegibles, en un plantel seguido (la liga argentina entera).",
    importance:
      "Cada movimiento tiene un peso base por tipo (tabla), más modificadores: +20 en un cambio de club cuando cambia el nivel de la competencia; hasta +30 en un movimiento del ranking según la cantidad de puestos (2 por puesto); +15 por hat-trick, por racha goleadora de cinco o por diez titularidades seguidas; +15 si el jugador está en la última lista; +10 si está entre los diez primeros de su puesto. El total se multiplica por nivel de competencia (1: ×1,00; 2: ×0,85; 3: ×0,70). Los movimientos del ranking solo se registran cuando tocan los primeros quince puestos y no se muestran para recién llegados, regresos o jugadores en enfermería. Las rachas de tres titularidades no se cuentan hasta el sexto partido de la temporada; las subidas y bajadas de minutos exigen al menos cuatro partidos del equipo en la ventana anterior.",
    watch:
      "El sitio rankea solo a los jugadores en la mira de la Selección: los que tienen al menos un partido con la mayor, los que estuvieron en alguna lista publicada, y los que juegan en un club de una competencia marcada en_watch en la tabla de competencias (las ligas europeas seguidas y el Brasileirão). La MLS, la Liga MX y la liga saudí cuentan solo por convocatoria. De la liga argentina entran por mérito los tres mejores por puesto en cada fecha de cálculo (domestic_watch_slots). Todos los jugadores seguidos tienen puntaje y estado; solo los de la mira tienen puesto en el ranking. Plantel y La fecha muestran a la mira por defecto y a toda la base con un interruptor.",
    home: [
      "La última lista muestra a los convocados con su temporada en el club desde el 1 de julio anterior al horizonte: minutos y goles más asistencias, o vallas invictas para arqueros y defensores. El 1 de julio arranca la temporada europea y la segunda mitad de las sudamericanas, así los minutos se comparan.",
      "Los que pelean el lugar: los tres mejores por puesto en la mira y fuera de la última lista, por el índice de temporada = (goles ×3 + asistencias ×2 + vallas invictas ×2 para arqueros y defensores + una por titularidad + minutos ÷ 90) × peso de la competencia (1,00 / 0,85 / 0,70 según nivel), desde el 1 de julio.",
      "Los de la semana: el mismo índice sin el peso de competencia, sobre los últimos siete días. Señales de alarma: jugadores en la mira cuyo club jugó y no sumaron minutos (primero los de la última lista, después por ranking), y titulares habituales (cuota de minutos de 50 % o más) con menos de 30 minutos en la semana.",
    ],
    windows:
      "Las fechas FIFA, los anuncios de lista y las listas mismas se mantienen a mano a partir de anuncios de la AFA y de la prensa argentina, y se resuelven a jugadores por nombre exacto sin acentos, luego apellido más inicial con un único candidato, y si no, un identificador fijado a mano. Fechas marcadas como previstas hasta que sean oficiales.",
    privacy:
      "La lista de seguidos y las notas viven en el almacenamiento local de este navegador. No se envían a ningún servidor, no hay cuentas y no hay analítica sobre ellas. Un enlace compartido lleva los identificadores de los jugadores en la URL y nada más. Borrar los datos del sitio en el navegador las borra: exportá un archivo cada tanto.",
    tables: { thresholds: "Umbrales", weights: "Pesos por puesto", eventWeights: "Pesos base por tipo de movimiento", windows: "Fechas FIFA cargadas", resolution: "Resolución de las listas", coverage: "Cobertura por liga", bySource: "Filas de estadísticas por fuente", agreement: "Acuerdo de minutos entre Highlightly y ESPN", unmatched: "Sin cruzar, por tipo", raw: "Registros crudos por fuente", runs: "Últimas corridas" },
    cols: { name: "Nombre", value: "Valor", description: "Descripción", posGroup: "Puesto", component: "Componente", weight: "Peso", type: "Tipo", window: "Fecha FIFA", dates: "Fechas", announcement: "Anuncio", status: "Estado", listed: "Listados", resolved: "Resueltos", league: "Liga", matches: "Partidos", hl: "con Highlightly", fd: "con football-data", box: "con ficha", source: "Fuente", rows: "Filas", players: "Jugadores", pairs: "Pares", within3: "dentro de 3 min", meanDiff: "diferencia media", maxDiff: "máxima", issue: "Tipo", count: "Cantidad", entity: "Entidad", records: "Registros", versions: "Versiones", last: "Último", started: "Inicio", command: "Comando", written: "Escritos", requests: "Pedidos" },
  },
  en: {
    what: [
      "albiceleste follows every player eligible for Argentina's senior national team who sits in a squad of the fourteen covered leagues, match by match, and answers one question: who is in form for the next squad, who is falling out of it, and who is knocking on the door.",
      "It is not a news site, it has no clips or contracts, and it does not replace a coaching staff's judgement. Every number it shows traces back to a source record; whatever is not in the data is said to be missing rather than invented.",
      "A personal project, unaffiliated with AFA or any club. Free data only.",
    ],
    horizon: (asOf: string, exported: string) =>
      `The data horizon is the last completed match loaded: ${asOf}. The snapshot the site reads was exported on ${exported}. Refreshes are manual (an ingestion run, the transformation model, the export and the site rebuild); there is no schedule, by choice.`,
    sources: [
      ["Wikidata", "identity, citizenships, national-team spells (CC0)"],
      ["ESPN", "squads, matches, line-ups and substitution minutes (internal endpoints, no key)"],
      ["Highlightly", "match statistics for the original seven leagues (free plan, daily quota)"],
      ["football-data.org", "matches and squads for the European competitions (free plan)"],
      ["Transfermarkt", "career history, transfers and market values from the CC0 transfermarkt-datasets snapshot (to June 2026)"],
      ["FPL", "Premier League identifiers"],
    ],
    eligibility:
      "Eligible: Argentine citizenship per Wikidata with no competitive cap for another senior team; or presence in an Argentine-league squad (assumed eligible unless the data says otherwise). Under review: dual nationals with ambiguous signals, or no Wikidata identity. Youth only: Argentina youth spells with competitive caps for another senior team. One competitive match for Argentina closes the door to another federation, and the reverse.",
    matching:
      "Every source has its own identifier. Matching goes through a normalised name (accents stripped, lower case) plus date of birth or club when present, with a hand-kept override table for the cases that fail. Whatever does not match lands in the data-quality tables rather than being dropped silently.",
    minutes:
      "Minutes come from Highlightly where a box score exists; otherwise they are derived from ESPN's substitution clock (a starter with no change = the match's minutes; a substitution in or out = the difference). The agreement table compares both sources where they overlap.",
    score: [
      "The ranking is the position of a score that is never shown. It is computed per player and position group at every scoring date (every Monday since August 2024 plus every squad announcement) over the last ten completed matches of the player's team in his current spell at the club (a club change starts the window from zero, with no score until three team matches).",
      "Components in [0, 1]: share of available minutes; share of starts; production (goals plus 0.7 assists per 90 against a positional reference for midfielders and forwards; clean sheets and goals conceded for goalkeepers and defenders). They are weighted per position (table) and the total is multiplied by the competition weight (tier 1: 1.00; tier 2: 0.80; tier 3: 0.60). Age never enters.",
      "The arrow is the change in rank since the date of the last squad announcement (or 28 days when none is recent).",
    ],
    states:
      "One state per player, in precedence order: retired; out (injured, suspended or absent); just moved (club change in the last 30 days); back (return from an absence in the last 14 days); no position or no minutes; short of minutes (no score for lack of matches, or minutes share under 40%); on fire (score 55 or more and a rise of 8 or more points in 28 days); rising (rise of 8 or more); declining (fall of 8 or more); established (score 50 or more, stable); steady.",
    infirmary:
      "Suspended: sent off in his last match and the club has not played since. Absent: a regular (minutes share of 40% or more at the last scoring date before the absence) with no minutes in three or more of his current club's matches, and not a new signing. Injured: never fires, because ESPN publishes no injury listings for soccer; hence the site says \"absent since\", not \"injured\". The date is the last match played.",
    trajectory:
      "Trajectory = current activity index (minutes share × competition weight over the team's last ten matches) divided by the 75th percentile of that index among pool players at the same age across the available history (floored at 0.10). The age percentile is the share of same-age observations at or below the index. The cohort: aged 23 or under at the horizon, eligible, in a tracked squad (the Argentine league in full).",
    importance:
      "Every mover has a base weight by kind (table) plus modifiers: +20 on a club change when the competition tier changes; up to +30 on a rank move by the number of places (2 per place); +15 for a hat-trick, a five-match scoring streak or ten straight starts; +15 when the player is in the last squad; +10 when he is in the top ten of his position. The total is multiplied by competition tier (1: ×1.00; 2: ×0.85; 3: ×0.70). Rank moves are only recorded when they touch the top fifteen and are not shown for new arrivals, returns or players in the infirmary. Streaks of three starts do not count until the sixth match of the season; minute surges and drops need at least four team matches in the previous window.",
    watch:
      "The site ranks only the players on the national team's watch: anyone with a senior cap, anyone who was in a published list, and anyone at a club in a competition flagged in_watch in the competitions table (the European leagues followed and the Brasileirão). MLS, Liga MX and the Saudi league count through a call-up only. From the Argentine league, the best three per position at every scoring date enter on merit (domestic_watch_slots). Everyone tracked has a score and a state; only the watch has a rank. Pool and La fecha show the watch by default and everyone tracked behind a switch.",
    home: [
      "The last list shows its players with their club season since the 1 July before the horizon: minutes and goals plus assists, or clean sheets for keepers and defenders. 1 July starts the European season and the second half of the South American ones, so minutes compare.",
      "Fighting for a place: the three best per position on the watch and outside the last list, by the season index = (goals ×3 + assists ×2 + clean sheets ×2 for keepers and defenders + one per start + minutes ÷ 90) × competition weight (1.00 / 0.85 / 0.70 by tier), since 1 July.",
      "Best of the week: the same index without the competition weight, over the last seven days. Worrying signs: watch players whose club played but who got no minutes (last list first, then by rank), and regulars (minutes share of 50% or more) with under 30 minutes in the week.",
    ],
    windows:
      "FIFA windows, announcement dates and the lists themselves are kept by hand from AFA announcements and the Argentine press, and resolved to players by exact unaccented name, then surname plus initial with a single candidate, else a hand-pinned identifier. Dates are marked expected until official.",
    privacy:
      "The follow list and the notes live in this browser's local storage. They are not sent to any server, there are no accounts and no analytics over them. A shared link carries the players' identifiers in the URL and nothing else. Clearing site data in the browser wipes them: export a file now and then.",
    tables: { thresholds: "Thresholds", weights: "Weights per position", eventWeights: "Base weights per kind of mover", windows: "Loaded FIFA windows", resolution: "Squad-list resolution", coverage: "Coverage by league", bySource: "Statistics rows by source", agreement: "Minutes agreement, Highlightly against ESPN", unmatched: "Unmatched, by kind", raw: "Raw records by source", runs: "Latest runs" },
    cols: { name: "Name", value: "Value", description: "Description", posGroup: "Position", component: "Component", weight: "Weight", type: "Kind", window: "Window", dates: "Dates", announcement: "Announcement", status: "Status", listed: "Listed", resolved: "Resolved", league: "League", matches: "Matches", hl: "with Highlightly", fd: "with football-data", box: "with box score", source: "Source", rows: "Rows", players: "Players", pairs: "Pairs", within3: "within 3 min", meanDiff: "mean difference", maxDiff: "max", issue: "Kind", count: "Count", entity: "Entity", records: "Records", versions: "Versions", last: "Last", started: "Started", command: "Command", written: "Written", requests: "Requests" },
  },
};

export default async function AboutPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await readLocale(params);
  const d = t(locale);
  const c = COPY[locale as Locale];
  const m = manifest();
  const [paramsRows, windows, squads, coverage, bySource, agreement, unmatched, raw, runs] = await Promise.all([
    getMethodParameters(),
    getWindows(),
    getSquadLists(),
    getCoverage(),
    getStatsBySource(),
    getAgreement(),
    getUnmatched(),
    getRawSummary(),
    getPipelineRuns(12),
  ]);
  const thresholds = paramsRows.filter((p) => p.kind === "threshold");
  const weights = paramsRows.filter((p) => p.kind === "weight");
  const eventWeights = paramsRows.filter((p) => p.kind === "event_weight");
  const unmatchedByIssue = Object.entries(unmatched.reduce<Record<string, number>>((acc, u) => ({ ...acc, [u.issue]: (acc[u.issue] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1]);
  const resolution = windows.map((w) => ({ w, rows: squads.filter((s) => s.window_id === w.window_id) }));
  const S = d.about.sections;
  const P = ({ children }: { children: string }) => <p className="mb-3 max-w-3xl text-sm leading-relaxed text-ink-2">{children}</p>;

  return (
    <>
      <PageTitle title={d.about.title} lede={d.about.lede} />

      <Section title={S.what}>
        {c.what.map((p, i) => (
          <P key={i}>{p}</P>
        ))}
        <P>{`${d.site.source}: ${REPO_URL}`}</P>
      </Section>

      <Section title={S.horizon}>
        <P>{c.horizon(fmtDate(locale, m.data_as_of), fmtDateTime(locale, m.exported_at))}</P>
      </Section>

      <Section title={S.sources}>
        <ul className="max-w-3xl text-sm leading-relaxed text-ink-2">
          {c.sources.map(([name, what]) => (
            <li key={name} className="border-b border-rule py-1">
              <span className="font-medium text-ink">{name}</span> · {what}
            </li>
          ))}
        </ul>
      </Section>

      <Section title={S.eligibility}>
        <P>{c.eligibility}</P>
      </Section>
      <Section title={S.matching}>
        <P>{c.matching}</P>
      </Section>
      <Section title={S.minutes}>
        <P>{c.minutes}</P>
      </Section>

      <Section title={S.score}>
        <div id="score" />
        {c.score.map((p, i) => (
          <P key={i}>{p}</P>
        ))}
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm text-muted">{c.tables.weights}</h3>
            <StaticTable rows={weights} rowKey={(r) => r.name} cols={[{ label: c.cols.posGroup, render: (r) => (d.pos as Record<string, string>)[r.pos_group ?? ""] ?? r.pos_group }, { label: c.cols.component, render: (r) => r.component ?? "" }, { label: c.cols.weight, align: "r", render: (r) => fmtDec(locale, r.value) }]} />
          </div>
          <div>
            <h3 className="mb-1 text-sm text-muted">{c.tables.thresholds}</h3>
            <StaticTable rows={thresholds} rowKey={(r) => r.name} cols={[{ label: c.cols.name, render: (r) => <span className="font-mono text-xs">{r.name}</span> }, { label: c.cols.value, align: "r", render: (r) => fmtDec(locale, r.value, Number.isInteger(r.value) ? 0 : 2) }, { label: c.cols.description, render: (r) => <span className="wrap text-xs text-ink-2">{r.description}</span> }]} />
          </div>
        </div>
      </Section>

      <Section title={S.states}>
        <P>{c.states}</P>
      </Section>
      <Section title={S.infirmary}>
        <P>{c.infirmary}</P>
      </Section>
      <Section title={S.trajectory}>
        <P>{c.trajectory}</P>
      </Section>

      <Section title={S.importance}>
        <P>{c.importance}</P>
        <h3 className="mb-1 text-sm text-muted">{c.tables.eventWeights}</h3>
        <div className="max-w-3xl">
          <StaticTable rows={eventWeights} rowKey={(r) => r.name} cols={[{ label: c.cols.type, render: (r) => (d.movers.kinds as Record<string, string>)[r.name] ?? r.name }, { label: c.cols.weight, align: "r", render: (r) => fmtInt(locale, r.value) }, { label: c.cols.description, render: (r) => <span className="text-xs text-ink-2">{r.description}</span> }]} />
        </div>
      </Section>

      <Section title={S.watch}>
        <div id="watch" />
        <P>{c.watch}</P>
      </Section>

      <Section title={S.home}>
        <div id="home" />
        {c.home.map((p, i) => (
          <P key={i}>{p}</P>
        ))}
      </Section>

      <Section title={S.windows}>
        <P>{c.windows}</P>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm text-muted">{c.tables.windows}</h3>
            <StaticTable
              rows={windows}
              rowKey={(r) => r.window_id}
              cols={[
                { label: c.cols.window, render: (r) => windowLabel(locale, r) },
                { label: c.cols.dates, render: (r) => `${fmtDate(locale, r.starts, false)} – ${fmtDate(locale, r.ends)}` },
                { label: c.cols.announcement, render: (r) => `${fmtDate(locale, r.announcement_date)} (${r.announcement_status === "official" ? d.common.official : d.common.expected})` },
                { label: c.cols.listed, align: "r", render: (r) => fmtInt(locale, r.listed) },
              ]}
            />
          </div>
          <div>
            <h3 className="mb-1 text-sm text-muted">{c.tables.resolution}</h3>
            <StaticTable
              rows={resolution.filter((x) => x.rows.length > 0)}
              rowKey={(r) => r.w.window_id}
              cols={[
                { label: c.cols.window, render: (r) => windowLabel(locale, r.w) },
                { label: c.cols.listed, align: "r", render: (r) => fmtInt(locale, r.rows.length) },
                { label: c.cols.resolved, align: "r", render: (r) => fmtInt(locale, r.rows.filter((s) => s.player_key).length) },
                { label: c.cols.status, render: (r) => r.rows.filter((s) => !s.player_key).map((s) => s.player_name).join(", ") || DASH },
              ]}
            />
          </div>
        </div>
      </Section>

      <Section title={S.quality}>
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h3 className="mb-1 text-sm text-muted">{c.tables.coverage}</h3>
            <StaticTable
              rows={coverage}
              rowKey={(r) => r.league}
              cols={[
                { label: c.cols.league, render: (r) => r.league },
                { label: c.cols.matches, align: "r", render: (r) => fmtInt(locale, r.matches) },
                { label: c.cols.hl, align: "r", render: (r) => fmtInt(locale, r.with_highlightly_match) },
                { label: c.cols.fd, align: "r", render: (r) => fmtInt(locale, r.with_fd_match) },
                { label: c.cols.box, align: "r", render: (r) => fmtInt(locale, r.with_box_score_rows) },
              ]}
            />
          </div>
          <div>
            <h3 className="mb-1 text-sm text-muted">{c.tables.bySource}</h3>
            <StaticTable rows={bySource} rowKey={(r) => `${r.league}-${r.stats_source}`} cols={[{ label: c.cols.league, render: (r) => r.league }, { label: c.cols.source, render: (r) => r.stats_source }, { label: c.cols.rows, align: "r", render: (r) => fmtInt(locale, r.rows) }, { label: c.cols.players, align: "r", render: (r) => fmtInt(locale, r.players) }]} />
            {agreement && (
              <Note>
                {c.tables.agreement}: {fmtInt(locale, agreement.pairs)} {c.cols.pairs.toLowerCase()}, {fmtDec(locale, agreement.pct_within_3_min, 1)}% {c.cols.within3}, {c.cols.meanDiff} {fmtDec(locale, agreement.mean_abs_diff, 1)}, {c.cols.maxDiff} {fmtInt(locale, agreement.max_abs_diff)}.
              </Note>
            )}
          </div>
          <div>
            <h3 className="mb-1 text-sm text-muted">{c.tables.unmatched}</h3>
            <StaticTable rows={unmatchedByIssue} rowKey={(r) => r[0]} cols={[{ label: c.cols.issue, render: (r) => r[0] }, { label: c.cols.count, align: "r", render: (r) => fmtInt(locale, r[1]) }]} />
          </div>
          <div>
            <h3 className="mb-1 text-sm text-muted">{c.tables.raw}</h3>
            <StaticTable rows={raw} rowKey={(r) => `${r.source}-${r.entity}`} cols={[{ label: c.cols.source, render: (r) => r.source }, { label: c.cols.entity, render: (r) => r.entity }, { label: c.cols.records, align: "r", render: (r) => fmtInt(locale, r.records) }, { label: c.cols.versions, align: "r", render: (r) => fmtInt(locale, r.versions) }, { label: c.cols.last, render: (r) => fmtDate(locale, r.last_ingested) }]} />
          </div>
        </div>
        <h3 className="mb-1 mt-8 text-sm text-muted">{c.tables.runs}</h3>
        <div className="max-w-3xl">
          <StaticTable rows={runs} rowKey={(r) => `${r.started_at}-${r.command}`} cols={[{ label: c.cols.started, render: (r) => fmtDateTime(locale, r.started_at) }, { label: c.cols.command, render: (r) => <span className="font-mono text-xs">{r.command}</span> }, { label: c.cols.status, render: (r) => r.status }, { label: c.cols.written, align: "r", render: (r) => fmtInt(locale, r.records_written) }, { label: c.cols.requests, align: "r", render: (r) => fmtInt(locale, r.requests_made) }]} />
        </div>
      </Section>

      <Section title={S.privacy}>
        <P>{c.privacy}</P>
      </Section>
    </>
  );
}
