export interface FlowNode {
  id: string;
  x: number;
  y: number;
  label: string;
  sub?: string;
  w?: number;
}
export interface FlowEdge {
  from: string;
  to: string;
  /** Bend the line through this point, for edges that would cross a box. */
  via?: [number, number];
}
export interface FlowGroup {
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** "online" draws the group dashed, for things outside the lamp. */
  kind?: "online";
}

interface Props {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  groups?: FlowGroup[];
  width?: number;
  height: number;
  /** Nodes drawn in orange: the current step or state. */
  active?: string[];
  /** Nodes drawn faded: switched off, or not part of this path. */
  dim?: string[];
  /** A dot travelling along one edge; `at` runs 0 to 1. `bad` turns it into a refused request. */
  packet?: { edge: number; at: number; label?: string; bad?: boolean };
  onSelect?: (id: string) => void;
  label: string;
}

const H = 40;

/** Boxes and arrows: a system map, a pipeline or a set of states, with a highlight and a moving message. */
export default function FlowMap({ nodes, edges = [], groups = [], width = 600, height, active = [], dim = [], packet, onSelect, label }: Props) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const w = (n: FlowNode) => n.w ?? 116;
  // Where an edge leaves or enters a box: the point on its border facing the other end.
  const port = (n: FlowNode, toward: [number, number]): [number, number] => {
    const dx = toward[0] - n.x;
    const dy = toward[1] - n.y;
    const sx = Math.abs(dx) / (w(n) / 2 + 4);
    const sy = Math.abs(dy) / (H / 2 + 4);
    const s = Math.max(sx, sy) || 1;
    return [n.x + dx / s, n.y + dy / s];
  };
  const pathOf = (e: FlowEdge) => {
    const a = byId[e.from];
    const b = byId[e.to];
    const p0 = port(a, e.via ?? [b.x, b.y]);
    const p1 = port(b, e.via ?? [a.x, a.y]);
    return e.via ? [p0, e.via, p1] : [p0, p1];
  };
  const pointAt = (pts: [number, number][], f: number) => {
    const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
    let d = f * lens.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lens.length; i++) {
      if (d <= lens[i] || i === lens.length - 1) {
        const k = Math.min(1, d / (lens[i] || 1));
        return [pts[i][0] + (pts[i + 1][0] - pts[i][0]) * k, pts[i][1] + (pts[i + 1][1] - pts[i][1]) * k];
      }
      d -= lens[i];
    }
    return pts[0];
  };
  const dot = packet && edges[packet.edge] ? pointAt(pathOf(edges[packet.edge]) as [number, number][], packet.at) : null;

  return (
    <svg className="lx-plot lx-flow" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={label}>
      <defs>
        <marker id="lx-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0L10 5L0 10z" fill="#9a948c" />
        </marker>
      </defs>
      {groups.map((g) => (
        <g key={g.label}>
          <rect x={g.x} y={g.y} width={g.w} height={g.h} rx={8} className={`lx-group ${g.kind === "online" ? "is-online" : ""}`} />
          <text x={g.x + 10} y={g.y + 16} className="lx-axis lx-group-label">{g.label}</text>
        </g>
      ))}
      {edges.map((e, i) => (
        <polyline key={i} points={pathOf(e).map((p) => p.join(",")).join(" ")} className="lx-edge" markerEnd="url(#lx-arrow)" />
      ))}
      {nodes.map((n) => {
        const on = active.includes(n.id);
        const off = dim.includes(n.id);
        return (
          <g
            key={n.id}
            className={`lx-node ${on ? "is-on" : ""} ${off ? "is-off" : ""} ${onSelect ? "is-button" : ""}`}
            onClick={onSelect ? () => onSelect(n.id) : undefined}
            onKeyDown={onSelect ? (e) => (e.key === "Enter" || e.key === " ") && onSelect(n.id) : undefined}
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? "button" : undefined}
            aria-pressed={onSelect ? on : undefined}
            aria-label={onSelect ? n.label : undefined}
          >
            <rect x={n.x - w(n) / 2} y={n.y - H / 2} width={w(n)} height={H} rx={6} />
            <text x={n.x} y={n.sub ? n.y - 3 : n.y + 4} textAnchor="middle" className="lx-node-label">{n.label}</text>
            {n.sub && <text x={n.x} y={n.y + 12} textAnchor="middle" className="lx-node-sub">{n.sub}</text>}
          </g>
        );
      })}
      {dot && (
        <g className={`lx-packet ${packet!.bad ? "is-bad" : ""}`}>
          <circle cx={dot[0]} cy={dot[1]} r={6} />
          {packet!.label && <text x={dot[0]} y={dot[1] - 10} textAnchor="middle">{packet!.label}</text>}
        </g>
      )}
    </svg>
  );
}
