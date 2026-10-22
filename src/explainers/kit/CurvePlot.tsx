export interface Series {
  label: string;
  points: [number, number][];
  /** "ink" for Orion's own plan, "heat" for the thing being compared or changed, "soft" for background. */
  tone?: "ink" | "heat" | "soft" | "link";
  dashed?: boolean;
  /** Draw each point as a dot: used to show the 50 individual goals sent each second. */
  dots?: boolean;
}

interface Props {
  series: Series[];
  duration: number;
  /** y range; padded from the data when not given. */
  range?: [number, number];
  cursor?: number;
  /** Horizontal reference lines, such as a speed limit. */
  lines?: { y: number; label: string }[];
  /** Vertical marks, such as keyframe arrivals. */
  marks?: { t: number; label?: string }[];
  yLabel: string;
  height?: number;
  format?: (y: number) => string;
}

const W = 600;
const PAD = { l: 44, r: 12, t: 12, b: 26 };

/** A line chart against time, with an optional moving cursor. Plain SVG, so it scales to its box. */
export default function CurvePlot({ series, duration, range, cursor, lines = [], marks = [], yLabel, height = 200, format }: Props) {
  const ys = series.flatMap((s) => s.points.map((p) => p[1])).concat(lines.map((l) => l.y));
  let [lo, hi] = range ?? [Math.min(...ys), Math.max(...ys)];
  if (!range) {
    const pad = (hi - lo) * 0.12 || 0.05;
    lo -= pad;
    hi += pad;
  }
  const x = (t: number) => PAD.l + (t / (duration || 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => PAD.t + (1 - (Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo || 1)) * (height - PAD.t - PAD.b);
  const fmt = format ?? ((v: number) => v.toFixed(Math.abs(hi - lo) < 2 ? 2 : 1));
  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];
  const step = duration > 6 ? 2 : duration > 2.5 ? 1 : 0.5;
  const tTicks = Array.from({ length: Math.floor(duration / step) + 1 }, (_, i) => i * step);

  return (
    <svg className="lx-plot" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={`${yLabel} over time: ${series.map((s) => s.label).join(", ")}`}>
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(v)} y2={y(v)} className="lx-grid" />
          <text x={PAD.l - 6} y={y(v) + 4} textAnchor="end" className="lx-axis">{fmt(v)}</text>
        </g>
      ))}
      {tTicks.map((t) => (
        <text key={t} x={x(t)} y={height - 8} textAnchor="middle" className="lx-axis">{t}s</text>
      ))}
      <text x={6} y={PAD.t + 2} className="lx-axis lx-ylabel" transform={`rotate(-90 6 ${PAD.t + 2})`} textAnchor="end">{yLabel}</text>
      {marks.map((m, i) => (
        <g key={i}>
          <line x1={x(m.t)} x2={x(m.t)} y1={PAD.t} y2={height - PAD.b} className="lx-markline" />
          {m.label && <text x={x(m.t) + 3} y={PAD.t + 9} className="lx-axis">{m.label}</text>}
        </g>
      ))}
      {lines.map((l) => (
        <g key={l.label}>
          <line x1={PAD.l} x2={W - PAD.r} y1={y(l.y)} y2={y(l.y)} className="lx-limit" />
          <text x={W - PAD.r} y={y(l.y) - 4} textAnchor="end" className="lx-axis lx-limit-text">{l.label}</text>
        </g>
      ))}
      {series.map((s) =>
        s.dots ? (
          <g key={s.label} className={`lx-dots lx-${s.tone ?? "ink"}`}>
            {s.points.map(([t, v], i) => <circle key={i} cx={x(t)} cy={y(v)} r={2.2} />)}
          </g>
        ) : (
          <polyline
            key={s.label}
            className={`lx-line lx-${s.tone ?? "ink"} ${s.dashed ? "is-dashed" : ""}`}
            points={s.points.map(([t, v]) => `${x(t).toFixed(1)},${y(v).toFixed(1)}`).join(" ")}
          />
        ),
      )}
      {cursor !== undefined && <line x1={x(cursor)} x2={x(cursor)} y1={PAD.t} y2={height - PAD.b} className="lx-cursor" />}
    </svg>
  );
}
