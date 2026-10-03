import { useRef, useState, type PointerEvent } from "react";
import "./explainer.css";

/**
 * Interactive two-link inverse kinematics.
 * Drag the orange target; the arm solves for its shoulder and elbow angles in closed form.
 * Used in MDX as: <TwoLinkIK client:visible l1={120} l2={90} />
 */
interface Props {
  l1?: number;
  l2?: number;
}

const W = 420;
const H = 300;
const BASE = { x: 140, y: 250 }; // shoulder position in SVG pixels
const deg = (r: number) => (r * 180) / Math.PI;

export default function TwoLinkIK({ l1 = 120, l2 = 90 }: Props) {
  const [target, setTarget] = useState({ x: 150, y: 110 }); // relative to the shoulder, y up
  const [elbowUp, setElbowUp] = useState(true);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  // Law of cosines. Clamp the reach so the arm stretches toward unreachable targets instead of failing.
  const reach = Math.hypot(target.x, target.y);
  const d = Math.min(Math.max(reach, Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
  const cosQ2 = (d * d - l1 * l1 - l2 * l2) / (2 * l1 * l2);
  const q2 = (elbowUp ? -1 : 1) * Math.acos(cosQ2);
  const q1 = Math.atan2(target.y, target.x) - Math.atan2(l2 * Math.sin(q2), l1 + l2 * Math.cos(q2));
  const reachable = reach <= l1 + l2 && reach >= Math.abs(l1 - l2);

  // Forward kinematics to draw the links (flip y for SVG).
  const elbow = { x: BASE.x + l1 * Math.cos(q1), y: BASE.y - l1 * Math.sin(q1) };
  const hand = { x: elbow.x + l2 * Math.cos(q1 + q2), y: elbow.y - l2 * Math.sin(q1 + q2) };
  const tgt = { x: BASE.x + target.x, y: BASE.y - target.y };

  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    setTarget({ x: x - BASE.x, y: BASE.y - y });
  };

  return (
    <figure className="explainer">
      <svg
        ref={svg}
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Two-link arm. Shoulder ${deg(q1).toFixed(0)} degrees, elbow ${deg(q2).toFixed(0)} degrees.`}
        onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); move(e); }}
        onPointerMove={move}
        onPointerUp={() => (dragging.current = false)}
        style={{ touchAction: "none" }}
      >
        <circle cx={BASE.x} cy={BASE.y} r={l1 + l2} className="ex-reach" />
        <line x1={20} y1={BASE.y} x2={W - 20} y2={BASE.y} className="ex-ground" />
        <polyline points={`${BASE.x},${BASE.y} ${elbow.x},${elbow.y} ${hand.x},${hand.y}`} className="ex-link" />
        <circle cx={BASE.x} cy={BASE.y} r={6} className="ex-joint" />
        <circle cx={elbow.x} cy={elbow.y} r={5} className="ex-joint" />
        <circle cx={tgt.x} cy={tgt.y} r={9} className="ex-target" />
      </svg>
      <figcaption>
        <span>θ₁ (shoulder) <b>{deg(q1).toFixed(1)}°</b></span>
        <span>θ₂ (elbow) <b>{deg(q2).toFixed(1)}°</b></span>
        <span className={reachable ? "" : "ex-warn"}>{reachable ? "In reach" : "Out of reach: arm stretches toward it"}</span>
        <button type="button" onClick={() => setElbowUp((v) => !v)}>
          {elbowUp ? "Elbow up" : "Elbow down"} ⇄
        </button>
      </figcaption>
    </figure>
  );
}
