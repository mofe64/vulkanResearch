import { useEffect, useRef, useState, type PointerEvent } from "react";
import RobotView from "../kit/RobotView";
import { POSES, clampToLimits, deg, rad, type Positions } from "../kit/orion";
import { reducedMotion, useOnScreen } from "../kit/playback";
import "../kit/kit.css";

// Orion's gaze constants (runtime/src/expression/gaze.rs).
const UPDATE = 0.1; // a new gaze plan every 0.1 s
const DEADBAND = rad(4); // closer than this counts as already looking
const NECK_STEP = (2.5 * UPDATE) / 1.875; // most the head turns per update
const NECK_LEAD = 0.2; // the head moves alone for this long before the base joins
const BASE_STEP = (0.6 * UPDATE) / 1.875; // the base's slower catch-up per update
const HOLD = 1.1; // how long it holds on a target that has gone

const home = POSES.home.positions;
const W = 300;
const H = 160;
const AZ = rad(60); // the pad spans 60° left and right
const EL = rad(25); // and 25° up and down

/**
 * A simplified version of Orion's gaze planner with its real constants: drag the face or hand and Orion follows.
 * The head leads; after a moment the base turns to centre the head; the arm keeps its pose.
 */
export default function GazeFollow({ mode }: { mode: "face" | "hand" }) {
  const [target, setTarget] = useState<{ az: number; el: number } | null>({ az: rad(-25), el: rad(5) });
  const [q, setQ] = useState<Positions>({ ...home });
  const [box, onScreen] = useOnScreen();
  const [lastPhase, setPhase] = useState("looking");
  const sim = useRef({ q: { ...home }, moveStart: 0, lostAt: -1, t: 0, prev: null as null | { az: number; el: number } });
  const targetRef = useRef(target);
  targetRef.current = target;
  const pad = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    if (!onScreen) return;
    const s = sim.current;
    const step = () => {
      s.t += UPDATE;
      const tgt = targetRef.current;
      const c = s.q;
      const look = c.base_yaw_joint + c.head_roll_joint - home.head_roll_joint; // where the head points, left/right
      const tilt = home.head_pitch_joint - c.head_pitch_joint; // and up/down, from home
      if (tgt) {
        s.lostAt = -1;
        if (!s.prev || Math.abs(tgt.az - s.prev.az) > DEADBAND || Math.abs(tgt.el - s.prev.el) > DEADBAND) {
          if (Math.abs(tgt.az - look) > DEADBAND) s.moveStart = s.t;
          s.prev = tgt;
        }
        const off = Math.abs(tgt.az - look) > DEADBAND || Math.abs(tgt.el - tilt) > DEADBAND;
        const centred = Math.abs(c.head_roll_joint - home.head_roll_joint) <= DEADBAND;
        if (off || !centred) {
          let base = c.base_yaw_joint;
          if (s.t - s.moveStart >= NECK_LEAD && !centred) {
            base = clampToLimits("base_yaw_joint", base + Math.max(-BASE_STEP, Math.min(BASE_STEP, tgt.az - base)));
          }
          // The head makes up the rest of the turn, within its step and its limits.
          const wantRoll = clampToLimits("head_roll_joint", home.head_roll_joint + tgt.az - base);
          const wantPitch = clampToLimits("head_pitch_joint", home.head_pitch_joint - tgt.el);
          const roll = c.head_roll_joint - (base - c.base_yaw_joint);
          s.q = {
            ...c,
            base_yaw_joint: base,
            head_roll_joint: roll + Math.max(-NECK_STEP, Math.min(NECK_STEP, wantRoll - roll)),
            head_pitch_joint: c.head_pitch_joint + Math.max(-NECK_STEP, Math.min(NECK_STEP, wantPitch - c.head_pitch_joint)),
          };
          setPhase(s.t - s.moveStart < NECK_LEAD ? "head leads" : centred ? "looking" : "base catching up");
        } else setPhase("looking");
      } else {
        if (s.lostAt < 0) s.lostAt = s.t;
        if (s.t - s.lostAt >= HOLD) {
          // Settle back to the anchor pose.
          s.q = Object.fromEntries(Object.entries(c).map(([j, v]) => [j, v + (home[j as keyof Positions] - v) * 0.12])) as Positions;
          setPhase("returning to its pose");
        } else setPhase("holding where it last saw it");
      }
      setQ(s.q);
    };
    const id = setInterval(step, reducedMotion() ? 300 : UPDATE * 1000);
    return () => clearInterval(id);
  }, [onScreen]);

  const toPad = (az: number, el: number) => [W / 2 - (az / AZ) * (W / 2 - 16), H / 2 - (el / EL) * (H / 2 - 16)];
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !pad.current) return;
    const r = pad.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * W;
    const y = ((e.clientY - r.top) / r.height) * H;
    setTarget({ az: Math.max(-AZ, Math.min(AZ, ((W / 2 - x) / (W / 2 - 16)) * AZ)), el: Math.max(-EL, Math.min(EL, ((H / 2 - y) / (H / 2 - 16)) * EL)) });
  };
  const [tx, ty] = target ? toPad(target.az, target.el) : [0, 0];
  const lookAz = q.base_yaw_joint + q.head_roll_joint - home.head_roll_joint;
  const [lx, ly] = toPad(lookAz, home.head_pitch_joint - q.head_pitch_joint);
  const icon = mode === "face" ? "🙂" : "✋";

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={q} camera="front" label={`Orion following a ${mode}`} />
      <div className="lx-body">
        <svg
          ref={pad}
          viewBox={`0 0 ${W} ${H}`}
          className="lx-plot lx-pad"
          style={{ touchAction: "none" }}
          role="img"
          aria-label={`Drag the ${mode} to move it in front of Orion`}
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); if (!target) setTarget({ az: 0, el: 0 }); move(e); }}
          onPointerMove={move}
          onPointerUp={() => (dragging.current = false)}
        >
          <rect x={1} y={1} width={W - 2} height={H - 2} rx={6} fill="#fafaf8" stroke="#e5e5e5" />
          <line x1={W / 2} x2={W / 2} y1={8} y2={H - 8} stroke="#eee" />
          <line x1={8} x2={W - 8} y1={H / 2} y2={H / 2} stroke="#eee" />
          <text x={10} y={H - 8} className="lx-axis">Orion's right</text>
          <text x={W - 10} y={H - 8} className="lx-axis" textAnchor="end">Orion's left</text>
          <circle cx={lx} cy={ly} r={16} fill="var(--link)" fillOpacity={0.12} stroke="var(--link)" strokeWidth={1.5} />
          <circle cx={lx} cy={ly} r={2.5} fill="var(--link)" />
          {target && <text x={tx} y={ty + 8} textAnchor="middle" fontSize={22} style={{ cursor: "grab" }}>{icon}</text>}
        </svg>
        <div className="lx-row">
          <button type="button" className="lx-btn" onClick={() => setTarget(target ? null : { az: rad(30), el: 0 })}>
            {target ? `Take the ${mode} away` : `Bring the ${mode} back`}
          </button>
          <span className="lx-note">Now: <b>{lastPhase}</b></span>
        </div>
        <div className="lx-stats">
          <span>Base <b>{deg(q.base_yaw_joint).toFixed(0)}°</b></span>
          <span>Head swivel <b>{deg(q.head_roll_joint).toFixed(0)}°</b></span>
          <span>Head nod <b>{deg(q.head_pitch_joint).toFixed(0)}°</b></span>
        </div>
      </div>
      <figcaption className="lx-caption">
        Drag the {mode} around (you're looking at Orion, so its left is on your right). The blue circle is where Orion
        is looking. Watch the numbers: the head swivel jumps first, then the base takes over the turn while the head
        swivel goes back toward the middle. A simplified copy of Orion's planner, using its real timings.
      </figcaption>
    </figure>
  );
}

export const FaceFollow = () => <GazeFollow mode="face" />;
export const HandFollow = () => <GazeFollow mode="hand" />;
