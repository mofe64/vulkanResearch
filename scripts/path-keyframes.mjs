// Turns "drive along this SVG path" into plain transform keyframes.
//
// CSS offset-path would do this in one line, but browsers disagree about which units path() uses on an
// element inside a scaled <svg>: Chromium uses the drawing's own units, while Safari and Firefox use CSS
// pixels, so once the drawing is shrunk (phones) the robot leaves the line and drives off the frame.
// translate()/rotate() on an element with transform-box: view-box is in the drawing's units everywhere.
//
// Supports the path shapes the hero drawings use: one M followed by absolute C segments.

const ease = (x1, y1, x2, y2) => (t) => {
  // cubic-bezier(x1, y1, x2, y2): find the curve parameter whose x is t, return its y.
  const bez = (a, b, u) => 3 * a * u * (1 - u) ** 2 + 3 * b * u ** 2 * (1 - u) + u ** 3;
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const mid = (lo + hi) / 2; bez(x1, x2, mid) < t ? (lo = mid) : (hi = mid); }
  return bez(y1, y2, (lo + hi) / 2);
};
export const EASE_IN_OUT = ease(0.42, 0, 0.58, 1);

function cubics(d) {
  if (/[^MC\d\s.,-]/.test(d) || !d.trim().startsWith("M")) throw new Error("only M + C paths are supported");
  const n = d.match(/-?\d*\.?\d+/g).map(Number);
  const segs = [];
  let p = [n[0], n[1]];
  for (let i = 2; i + 5 < n.length; i += 6) {
    const c = [p, [n[i], n[i + 1]], [n[i + 2], n[i + 3]], [n[i + 4], n[i + 5]]];
    segs.push(c);
    p = c[3];
  }
  return segs;
}

const at = ([a, b, c, d], u) => {
  const v = 1 - u;
  const pt = (k) => v ** 3 * a[k] + 3 * v * v * u * b[k] + 3 * v * u * u * c[k] + u ** 3 * d[k];
  const dt = (k) => 3 * v * v * (b[k] - a[k]) + 6 * v * u * (c[k] - b[k]) + 3 * u * u * (d[k] - c[k]);
  return { x: pt(0), y: pt(1), deg: (Math.atan2(dt(1), dt(0)) * 180) / Math.PI };
};

/** Points spaced evenly by distance along the path, so progress maps to distance like offset-distance. */
function sampler(d, steps = 2000) {
  const pts = [];
  for (const seg of cubics(d)) for (let i = 0; i <= steps; i++) pts.push(at(seg, i / steps));
  const len = [0];
  for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = len.at(-1);
  return (f) => {
    const want = f * total;
    let i = len.findIndex((l) => l >= want);
    if (i < 0) i = pts.length - 1;
    return pts[i];
  };
}

/**
 * @param d     the path, in the drawing's units
 * @param from  keyframe % where the drive starts (held still before it)
 * @param to    keyframe % where it ends (held still after it)
 * @param count number of keyframes between them
 * Returns the body of an @keyframes rule; use it with animation-timing-function: linear, because the
 * easing is already baked into where each keyframe sits.
 */
export function pathKeyframes(d, { from = 0, to = 100, count = 48, easing = EASE_IN_OUT } = {}) {
  const pos = sampler(d);
  const r = (n) => Math.round(n * 10) / 10;
  const frame = (f) => {
    const p = pos(f);
    return `transform:translate(${r(p.x)}px,${r(p.y)}px) rotate(${r(p.deg)}deg)`;
  };
  const out = [`0%,${from}%{${frame(0)}}`];
  for (let i = 1; i < count; i++) {
    const t = i / count;
    out.push(`${r(from + (to - from) * t)}%{${frame(easing(t))}}`);
  }
  out.push(`${to}%,100%{${frame(1)}}`);
  return out.join("");
}
