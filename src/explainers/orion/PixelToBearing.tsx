import { useState, type PointerEvent } from "react";
import "../kit/kit.css";

const FOV = 102; // horizontal field of view in degrees (vision/orion_vision/intrinsics.py)
const IMG_W = 640; // frames are processed at 640 × 360
const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;

/**
 * Seen from above: the camera's view cone, a person in the room, and the picture the camera takes. Turn the head and
 * the person moves across the picture, but the direction Orion works out for them stays the same.
 */
export default function PixelToBearing() {
  const [head, setHead] = useState(0); // where the camera points, degrees, + = Orion's left
  const [person, setPerson] = useState({ x: 120, y: -150 }); // cm-ish, lamp at the origin, -y is in front
  const [drag, setDrag] = useState(false);
  const bearing = deg(Math.atan2(-person.x, -person.y)); // + = Orion's left
  const rel = bearing - head;
  const inView = Math.abs(rel) <= FOV / 2;
  // A pinhole camera: the person's column in the picture depends on the angle off the camera's centre line.
  const f = IMG_W / 2 / Math.tan(rad(FOV / 2));
  const px = IMG_W / 2 - f * Math.tan(rad(rel));
  const S = 0.9; // svg units per cm
  const cx = 300;
  const cy = 230;
  const toSvg = (x: number, y: number) => [cx + x * S, cy + y * S];
  const [pxs, pys] = toSvg(person.x, person.y);
  const cone = (a: number) => toSvg(-Math.sin(rad(a)) * 300, -Math.cos(rad(a)) * 300);
  const [l1, l2] = [cone(head + FOV / 2), cone(head - FOV / 2)];
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const r = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 600;
    const y = ((e.clientY - r.top) / r.height) * 250;
    setPerson({ x: (x - cx) / S, y: Math.min(-30, (y - cy) / S) });
  };
  return (
    <figure className="lx">
      <div className="lx-body">
        <svg viewBox="0 0 600 250" className="lx-plot" style={{ touchAction: "none" }} role="img" aria-label="Top view of Orion's camera cone and a person"
          onPointerDown={(e) => { setDrag(true); e.currentTarget.setPointerCapture(e.pointerId); }} onPointerMove={move} onPointerUp={() => setDrag(false)}>
          <polygon points={`${cx},${cy} ${l1.join(",")} ${l2.join(",")}`} fill="var(--heat)" fillOpacity={0.07} stroke="var(--heat)" strokeOpacity={0.4} />
          <line x1={cx} y1={cy} x2={toSvg(-Math.sin(rad(bearing)) * 300, -Math.cos(rad(bearing)) * 300)[0]} y2={toSvg(-Math.sin(rad(bearing)) * 300, -Math.cos(rad(bearing)) * 300)[1]} stroke="var(--link)" strokeDasharray="4 4" />
          <rect x={cx - 14} y={cy - 8} width={28} height={16} rx={3} fill="#fff" stroke="#3b3632" />
          <text x={cx} y={cy + 24} textAnchor="middle" className="lx-axis">Orion, from above</text>
          <text x={pxs} y={pys + 8} textAnchor="middle" fontSize={22} style={{ cursor: "grab" }}>🙂</text>
        </svg>
        <div className="lx-image" aria-label="The camera's picture">
          <span className="lx-label">The camera's picture (640 pixels wide)</span>
          <div className="lx-strip">
            {inView ? <span className="lx-face" style={{ left: `${(px / IMG_W) * 100}%` }}>🙂</span> : <span className="lx-note">Out of view</span>}
          </div>
        </div>
        <label className="lx-slider"><span>Turn the head</span><input type="range" min={-60} max={60} step={1} value={head} onChange={(e) => setHead(Number(e.target.value))} /><output>{head}°</output></label>
        <div className="lx-stats">
          <span>In the picture at <b>{inView ? `x = ${Math.round(px)}` : "–"}</b></span>
          <span>Direction from the base <b>{Math.abs(bearing).toFixed(0)}° {bearing > 0 ? "left" : "right"}</b></span>
        </div>
      </div>
      <figcaption className="lx-caption">Drag the person, then turn the head. Their spot in the picture changes, but Orion combines it with where the camera was pointing at that instant, so the direction from the base (the blue line) stays put.</figcaption>
    </figure>
  );
}
