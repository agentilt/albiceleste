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

/** Horizontal magnitude bars: one hue, category labels on the left, the value printed at the bar end. Server-rendered SVG. */
export function Bars({ data, width = 560, rowHeight = 26, format = int }: { data: { label: string; value: number }[]; width?: number; rowHeight?: number; format?: (v: number) => string }) {
  if (data.length === 0) return <p className="text-sm text-muted">No data.</p>;
  const labelW = 150;
  const valueW = 56;
  const height = data.length * rowHeight;
  const x = scaleLinear()
    .domain([0, max(data, (d) => d.value) ?? 1])
    .range([0, width - labelW - valueW]);
  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="bar chart" style={{ maxWidth: width }}>
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

/** Per-match minutes as thin bars (starters in deep celeste, substitutes lighter) with a rolling average of five in ink. */
export function MinutesTimeline({ points, width = 900, height = 220 }: { points: { date: string; minutes: number; starter: boolean }[]; width?: number; height?: number }) {
  if (points.length === 0) return <p className="text-sm text-muted">No matches.</p>;
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
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label="minutes per match">
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
            <title>{`${p.date}: ${p.minutes} min${p.starter ? ", started" : ""}`}</title>
          </rect>
        ))}
        {path && <path d={path} fill="none" stroke={INK} strokeWidth={1.5} />}
        {xTicks(x, iw).map((t) => (
          <text key={t.toISOString()} x={x(t)} y={ih + 16} textAnchor="middle" fontSize={11} fill={MUTED}>
            {t.toLocaleDateString("en-GB", spanYears(x) < 0.3 ? { day: "numeric", month: "short" } : { month: "short", year: "2-digit" })}
          </text>
        ))}
      </g>
    </svg>
  );
}

/** Single-series line over dates or years, with points and a formatted y axis. */
export function LineChart({ points, width = 560, height = 200, format = int, yLabel }: { points: { x: string | number; y: number }[]; width?: number; height?: number; format?: (v: number) => string; yLabel?: string }) {
  if (points.length === 0) return <p className="text-sm text-muted">No data.</p>;
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
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={yLabel ?? "line chart"} style={{ maxWidth: width }}>
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
            {t.toLocaleDateString("en-GB", spanYears(x) >= 3 ? { year: "numeric" } : { month: "short", year: "2-digit" })}
          </text>
        ))}
      </g>
    </svg>
  );
}
