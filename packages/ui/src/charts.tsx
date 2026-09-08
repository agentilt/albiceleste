import type { ReactNode } from "react";
import { max } from "d3-array";
import { type ScaleTime, scaleLinear, scaleTime } from "d3-scale";
import { line as d3line } from "d3-shape";
import { int } from "./format";

const INK = "var(--color-ink)";
const MUTED = "var(--color-muted)";
const RULE = "var(--color-rule)";
const BLUE = "var(--color-celeste-deep)";

function spanYears(x: ScaleTime<number, number>): number {
  const [a, b] = x.domain();
  return (b!.getTime() - a!.getTime()) / (365.25 * 24 * 3600 * 1000);
}

function xTicks(x: ScaleTime<number, number>, width: number): Date[] {
  const n = Math.max(2, Math.min(6, Math.floor(width / 110)));
  const ticks = spanYears(x) >= 3 ? x.ticks(n).filter((d) => d.getMonth() === 0 && d.getDate() === 1) : x.ticks(n);
  // d3's tick count is approximate; thin evenly so labels never crowd.
  const stride = Math.ceil(ticks.length / n);
  return stride > 1 ? ticks.filter((_, i) => i % stride === 0) : ticks;
}

/**
 * Two renders of one chart: the wide one from `sm` up, the narrow one below, so tick text stays legible on a phone
 * instead of shrinking with the viewBox.
 */
function Twin({ wide, narrow }: { wide: ReactNode; narrow: ReactNode }) {
  return (
    <>
      <div className="hidden sm:block">{wide}</div>
      <div className="sm:hidden">{narrow}</div>
    </>
  );
}

export interface BarsProps {
  data: { label: string; value: number }[];
  width?: number;
  rowHeight?: number;
  format?: (v: number) => string;
  /** accessible name, in the reader's language */
  label?: string;
  /** width of the phone render; omit for a single render */
  narrow?: number;
  empty?: string;
}

function BarsSvg({ data, width = 560, rowHeight = 26, format = int, label = "bar chart" }: Omit<BarsProps, "narrow" | "empty">) {
  const labelW = Math.min(150, Math.round(width * 0.36));
  const valueW = 56;
  const height = data.length * rowHeight;
  const x = scaleLinear()
    .domain([0, max(data, (d) => d.value) ?? 1])
    .range([0, width - labelW - valueW]);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label} style={{ maxWidth: width }}>
      {data.map((d, i) => {
        const y = i * rowHeight;
        return (
          <g key={d.label} transform={`translate(0,${y})`}>
            <text x={labelW - 10} y={rowHeight / 2} dy="0.35em" textAnchor="end" fontSize={12} fill={INK}>
              {d.label}
            </text>
            <rect x={labelW} y={rowHeight * 0.2} width={x(d.value)} height={rowHeight * 0.6} fill={BLUE} />
            <text x={labelW + x(d.value) + 6} y={rowHeight / 2} dy="0.35em" fontSize={12} fill={INK} className="num">
              {format(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Horizontal magnitude bars: one hue, category labels on the left, the value printed at the bar end. Server-rendered SVG. */
export function Bars(props: BarsProps) {
  const { narrow, empty = "No data.", ...rest } = props;
  if (rest.data.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return narrow ? <Twin wide={<BarsSvg {...rest} />} narrow={<BarsSvg {...rest} width={narrow} />} /> : <BarsSvg {...rest} />;
}

export interface MinutesTimelineProps {
  points: { date: string; minutes: number; starter: boolean }[];
  width?: number;
  height?: number;
  markers?: { date: string; label: string }[];
  /** BCP 47 tag for the tick dates */
  locale?: string;
  label?: string;
  narrow?: number;
  empty?: string;
}

function MinutesTimelineSvg({ points, width = 900, height = 220, markers = [], locale = "en-GB", label = "minutes per match" }: Omit<MinutesTimelineProps, "narrow" | "empty">) {
  const m = { top: 10, right: 12, bottom: 24, left: 34 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const dates = points.map((p) => new Date(p.date));
  const x = scaleTime()
    .domain([dates[0]!, dates[dates.length - 1]!])
    .range([0, iw]);
  const y = scaleLinear().domain([0, 120]).range([ih, 0]);
  const rolling = points.map((_, i) => {
    const slice = points.slice(Math.max(0, i - 4), i + 1);
    return slice.reduce((s, p) => s + p.minutes, 0) / slice.length;
  });
  const path = d3line<number>()
    .x((_, i) => x(dates[i]!))
    .y((v) => y(v))(rolling);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label}>
      <g transform={`translate(${m.left},${m.top})`}>
        {[0, 45, 90].map((t) => (
          <g key={t}>
            <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={RULE} />
            <text x={-8} y={y(t)} dy="0.35em" textAnchor="end" fontSize={11} fill={MUTED}>
              {t}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <rect key={p.date + i} x={x(dates[i]!) - 2} y={y(p.minutes)} width={4} height={ih - y(p.minutes)} fill={p.starter ? BLUE : "var(--color-celeste)"}>
            <title>{`${p.date}: ${p.minutes}′`}</title>
          </rect>
        ))}
        {path && <path d={path} fill="none" stroke={INK} strokeWidth={1.5} />}
        {markers
          .filter((mk) => new Date(mk.date) >= dates[0]! && new Date(mk.date) <= dates[dates.length - 1]!)
          .map((mk) => (
            <g key={mk.date}>
              <line x1={x(new Date(mk.date))} x2={x(new Date(mk.date))} y1={0} y2={ih} stroke="var(--color-rule-strong)" strokeDasharray="3 3" />
              <text x={x(new Date(mk.date)) + 4} y={10} fontSize={10} fill={MUTED}>
                {mk.label}
              </text>
            </g>
          ))}
        {xTicks(x, iw).map((t) => (
          <text key={t.toISOString()} x={x(t)} y={ih + 16} textAnchor="middle" fontSize={11} fill={MUTED}>
            {t.toLocaleDateString(locale, spanYears(x) < 0.3 ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" })}
          </text>
        ))}
      </g>
    </svg>
  );
}

/** Per-match minutes as thin bars (starters in deep celeste, substitutes lighter) with a rolling average of five in ink. */
export function MinutesTimeline(props: MinutesTimelineProps) {
  const { narrow, empty = "No matches.", ...rest } = props;
  if (rest.points.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return narrow ? <Twin wide={<MinutesTimelineSvg {...rest} />} narrow={<MinutesTimelineSvg {...rest} width={narrow} />} /> : <MinutesTimelineSvg {...rest} />;
}

export interface LineChartProps {
  points: { x: string | number; y: number }[];
  width?: number;
  height?: number;
  format?: (v: number) => string;
  /** the series name: the accessible name and the fallback label */
  yLabel?: string;
  locale?: string;
  label?: string;
  narrow?: number;
  empty?: string;
}

function LineChartSvg({ points, width = 560, height = 200, format = int, yLabel, locale = "en-GB", label }: Omit<LineChartProps, "narrow" | "empty">) {
  const m = { top: 12, right: 16, bottom: 24, left: 52 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const xs = points.map((p) => (typeof p.x === "number" ? new Date(p.x, 0, 1) : new Date(p.x)));
  const x = scaleTime()
    .domain([xs[0]!, xs[xs.length - 1]!])
    .range([0, iw]);
  const y = scaleLinear()
    .domain([0, max(points, (p) => p.y) ?? 1])
    .nice()
    .range([ih, 0]);
  const path = d3line<{ x: string | number; y: number }>()
    .x((_, i) => x(xs[i]!))
    .y((p) => y(p.y))(points);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label ?? yLabel ?? "line chart"} style={{ maxWidth: width }}>
      <g transform={`translate(${m.left},${m.top})`}>
        {y.ticks(4).map((t) => (
          <g key={t}>
            <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={RULE} />
            <text x={-8} y={y(t)} dy="0.35em" textAnchor="end" fontSize={11} fill={MUTED}>
              {format(t)}
            </text>
          </g>
        ))}
        {path && <path d={path} fill="none" stroke={BLUE} strokeWidth={1.75} />}
        {points.map((p, i) => (
          <circle key={i} cx={x(xs[i]!)} cy={y(p.y)} r={2.5} fill={BLUE}>
            <title>{`${p.x}: ${format(p.y)}`}</title>
          </circle>
        ))}
        {xTicks(x, iw).map((t) => (
          <text key={t.toISOString()} x={x(t)} y={ih + 16} textAnchor="middle" fontSize={11} fill={MUTED}>
            {t.toLocaleDateString(locale, spanYears(x) >= 3 ? { year: "numeric" } : { month: "short", year: "2-digit" })}
          </text>
        ))}
      </g>
    </svg>
  );
}

/** Single-series line over dates or years, with points and a formatted y axis. */
export function LineChart(props: LineChartProps) {
  const { narrow, empty = "No data.", ...rest } = props;
  if (rest.points.length === 0) return <p className="text-sm text-muted">{empty}</p>;
  return narrow ? <Twin wide={<LineChartSvg {...rest} />} narrow={<LineChartSvg {...rest} width={narrow} />} /> : <LineChartSvg {...rest} />;
}

const SERIES = ["var(--color-ink)", "var(--color-celeste-deep)", "var(--color-gold)", "var(--color-danger)"];

/**
 * Radar for Compare: every axis is a percentile (0–100) so the scale is identical; series are outlines with a light fill in
 * distinct strokes; the value is printed at each vertex in the series colour. Axis order is the caller's (fixed per position).
 * A missing value (no ranking yet) leaves the vertex out rather than drawing it at zero.
 */
export function Radar({ axes, series, size = 360, label = "radar" }: { axes: { key: string; label: string }[]; series: { name: string; values: (number | null)[] }[]; size?: number; label?: string }) {
  const n = axes.length;
  if (n < 3) return <p className="text-sm text-muted">—</p>;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 96;
  const angle = (i: number) => -Math.PI / 2 + (2 * Math.PI * i) / n;
  const pt = (i: number, v: number) => [cx + r * (v / 100) * Math.cos(angle(i)), cy + r * (v / 100) * Math.sin(angle(i))] as const;
  const labelPt = (i: number) => [cx + (r + 18) * Math.cos(angle(i)), cy + (r + 18) * Math.sin(angle(i))] as const;
  const ring = (v: number) =>
    axes
      .map((_, i) => pt(i, v))
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ") + "Z";
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" role="img" aria-label={label} style={{ maxWidth: size }}>
      {[25, 50, 75, 100].map((v) => (
        <path key={v} d={ring(v)} fill="none" stroke={v === 100 ? "var(--color-rule-strong)" : RULE} />
      ))}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 100);
        const [lx, ly] = labelPt(i);
        const anchor = Math.abs(Math.cos(angle(i))) < 0.2 ? "middle" : Math.cos(angle(i)) > 0 ? "start" : "end";
        return (
          <g key={a.key}>
            <line x1={cx} y1={cy} x2={x} y2={y} stroke={RULE} />
            <text x={lx} y={ly} dy="0.35em" textAnchor={anchor} fontSize={11} fill={MUTED}>
              {a.label}
            </text>
          </g>
        );
      })}
      {series.map((s, si) => {
        const present = s.values.map((v, i) => (v === null ? -1 : i)).filter((i) => i >= 0);
        if (present.length === 0) return null;
        const pts = present.map((i) => [i, pt(i, s.values[i]!)] as const);
        const closed = present.length >= 3;
        const d = present.length >= 2 ? pts.map(([, [x, y]], k) => `${k === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + (closed ? "Z" : "") : null;
        const color = SERIES[si % SERIES.length];
        return (
          <g key={s.name}>
            {d && <path d={d} fill={closed ? color : "none"} fillOpacity={0.08} stroke={color} strokeWidth={1.75} />}
            {pts.map(([i, [x, y]]) => (
              <g key={i}>
                <circle cx={x} cy={y} r={2.5} fill={color} />
                <text x={x + (Math.cos(angle(i)) >= 0 ? 6 : -6)} y={y - 6 + si * 11} textAnchor={Math.cos(angle(i)) >= 0 ? "start" : "end"} fontSize={10} fill={color} className="num">
                  {s.values[i]}
                </text>
              </g>
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** Minutes per match as a small aligned strip: shared date domain so several sparklines line up in Compare. */
export function Sparkline({ points, domain, width = 220, height = 36, label = "minutes per match" }: { points: { date: string; minutes: number; starter: boolean }[]; domain: [string, string]; width?: number; height?: number; label?: string }) {
  const x = scaleTime()
    .domain([new Date(domain[0]), new Date(domain[1])])
    .range([2, width - 2]);
  const y = scaleLinear().domain([0, 100]).range([height - 1, 2]);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label} style={{ maxWidth: width }}>
      <line x1={0} x2={width} y1={height - 1} y2={height - 1} stroke={RULE} />
      {points.map((p, i) => (
        <rect key={p.date + i} x={x(new Date(p.date)) - 1.5} y={y(Math.min(100, p.minutes))} width={3} height={height - 1 - y(Math.min(100, p.minutes))} fill={p.starter ? BLUE : "var(--color-celeste)"}>
          <title>{`${p.date}: ${p.minutes}′`}</title>
        </rect>
      ))}
    </svg>
  );
}

export interface RankHistoryProps {
  points: { date: string; rank: number | null }[];
  windows?: { date: string; label: string }[];
  calls?: string[];
  width?: number;
  height?: number;
  maxRank?: number;
  locale?: string;
  label?: string;
  narrow?: number;
  empty?: string;
}

function RankHistorySvg({ points, windows = [], calls = [], width = 900, height = 220, maxRank, locale = "en-GB", label = "rank history" }: Omit<RankHistoryProps, "narrow" | "empty">) {
  const known = points.filter((p): p is { date: string; rank: number } => p.rank !== null);
  const m = { top: 12, right: 12, bottom: 24, left: 34 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const x = scaleTime()
    .domain([new Date(points[0]!.date), new Date(points[points.length - 1]!.date)])
    .range([0, iw]);
  const top = maxRank ?? Math.max(20, ...known.map((p) => p.rank));
  const y = scaleLinear().domain([1, top]).range([0, ih]).clamp(true);
  const segs: { date: string; rank: number }[][] = [];
  let cur: { date: string; rank: number }[] = [];
  for (const p of points) {
    if (p.rank === null) {
      if (cur.length) segs.push(cur);
      cur = [];
    } else cur.push({ date: p.date, rank: p.rank });
  }
  if (cur.length) segs.push(cur);
  const line = d3line<{ date: string; rank: number }>()
    .x((p) => x(new Date(p.date)))
    .y((p) => y(p.rank));
  const ticks = [1, 5, 10, 20, 50].filter((t) => t <= top);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label}>
      <g transform={`translate(${m.left},${m.top})`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={RULE} />
            <text x={-8} y={y(t)} dy="0.35em" textAnchor="end" fontSize={11} fill={MUTED}>
              {t}
            </text>
          </g>
        ))}
        {windows.map((w) => (
          <g key={w.date}>
            <line x1={x(new Date(w.date))} x2={x(new Date(w.date))} y1={0} y2={ih} stroke="var(--color-rule-strong)" strokeDasharray="3 3" />
            <text x={x(new Date(w.date)) + 4} y={10} fontSize={10} fill={MUTED}>
              {w.label}
            </text>
          </g>
        ))}
        {segs.map((s, i) => (
          <path key={i} d={line(s) ?? ""} fill="none" stroke={INK} strokeWidth={1.5} />
        ))}
        {calls.map((c) => {
          const p = known.find((k) => k.date >= c) ?? known[known.length - 1]!;
          return <circle key={c} cx={x(new Date(c))} cy={y(p.rank)} r={4} fill={BLUE} />;
        })}
        {xTicks(x, iw).map((t) => (
          <text key={t.toISOString()} x={x(t)} y={ih + 16} textAnchor="middle" fontSize={11} fill={MUTED}>
            {t.toLocaleDateString(locale, { month: "short", year: "2-digit" })}
          </text>
        ))}
      </g>
    </svg>
  );
}

/** Rank within the position over time (1 at the top), with squad-announcement dates as vertical rules and call-ups as marks. */
export function RankHistory(props: RankHistoryProps) {
  const { narrow, empty = "—", ...rest } = props;
  if (!rest.points.some((p) => p.rank !== null)) return <p className="text-sm text-muted">{empty}</p>;
  return narrow ? <Twin wide={<RankHistorySvg {...rest} />} narrow={<RankHistorySvg {...rest} width={narrow} />} /> : <RankHistorySvg {...rest} />;
}

export interface AgeScatterProps {
  points: { key: string; label: string; age: number; value: number; followed?: boolean; href?: string }[];
  band: { age: number; p25: number; p50: number; p75: number; p90: number }[];
  xDomain?: [number, number];
  width?: number;
  height?: number;
  yLabel?: string;
  label?: string;
  narrow?: number;
}

function AgeScatterSvg({ points, band, xDomain = [16, 23], width = 420, height = 240, yLabel = "index", label }: Omit<AgeScatterProps, "narrow">) {
  const m = { top: 12, right: 12, bottom: 26, left: 36 };
  const iw = width - m.left - m.right;
  const ih = height - m.top - m.bottom;
  const x = scaleLinear().domain(xDomain).range([0, iw]);
  const y = scaleLinear().domain([0, 1]).range([ih, 0]).clamp(true);
  const sorted = [...band].filter((b) => b.age >= xDomain[0] && b.age <= xDomain[1]).sort((a, b) => a.age - b.age);
  const area =
    sorted.length > 1
      ? `M${sorted.map((b) => `${x(b.age)},${y(b.p25)}`).join(" L")} L${[...sorted].reverse().map((b) => `${x(b.age)},${y(b.p75)}`).join(" L")}Z`
      : null;
  const mid = sorted.length > 1 ? `M${sorted.map((b) => `${x(b.age)},${y(b.p50)}`).join(" L")}` : null;
  const p90 = sorted.length > 1 ? `M${sorted.map((b) => `${x(b.age)},${y(b.p90)}`).join(" L")}` : null;
  // spread points sharing an age a little so they do not stack
  const byAge = new Map<number, number>();
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={label ?? `age against ${yLabel}`} style={{ maxWidth: width }}>
      <g transform={`translate(${m.left},${m.top})`}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={0} x2={iw} y1={y(t)} y2={y(t)} stroke={RULE} />
            <text x={-8} y={y(t)} dy="0.35em" textAnchor="end" fontSize={10} fill={MUTED}>
              {t}
            </text>
          </g>
        ))}
        {area && <path d={area} fill="var(--color-celeste-tint)" />}
        {mid && <path d={mid} fill="none" stroke="var(--color-celeste)" strokeWidth={1.25} />}
        {p90 && <path d={p90} fill="none" stroke="var(--color-celeste)" strokeWidth={1} strokeDasharray="2 3" />}
        {points.map((p) => {
          const k = byAge.get(p.age) ?? 0;
          byAge.set(p.age, k + 1);
          const dx = ((k % 5) - 2) * 3;
          const cx = x(p.age) + dx;
          const cy = y(p.value);
          const dot = <circle cx={cx} cy={cy} r={p.followed ? 4 : 3} fill={p.followed ? INK : "var(--color-surface)"} stroke={p.followed ? INK : BLUE} strokeWidth={1.25} />;
          return (
            <g key={p.key}>
              {/* points stay clickable but out of the tab order: hundreds of stops would trap a keyboard user */}
              {p.href ? (
                <a href={p.href} tabIndex={-1} aria-hidden="true">
                  {dot}
                </a>
              ) : (
                dot
              )}
              <title>{`${p.label}: ${p.age}, ${p.value.toFixed(2)}`}</title>
            </g>
          );
        })}
        {x.ticks(xDomain[1] - xDomain[0]).map((t) => (
          <text key={t} x={x(t)} y={ih + 16} textAnchor="middle" fontSize={10} fill={MUTED}>
            {t}
          </text>
        ))}
      </g>
    </svg>
  );
}

/**
 * Age against an activity index for the Next cycle: one point per youngster, the pool's reference band (p25–p75, median as a
 * line, p90 dotted) behind. Followed points are filled. Hover names a point.
 */
export function AgeScatter(props: AgeScatterProps) {
  const { narrow, ...rest } = props;
  return narrow ? <Twin wide={<AgeScatterSvg {...rest} />} narrow={<AgeScatterSvg {...rest} width={narrow} />} /> : <AgeScatterSvg {...rest} />;
}
