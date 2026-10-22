import { useState } from "react";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { MOTIONS, POSES, zeros, type Keyframe, type Motion } from "../kit/orion";
import { stateAt, useOnScreen, usePlayback } from "../kit/playback";
import { keyframeTimes, useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

// Orion's own expressive glance, broken into its parts: each extra pose is one animation principle.
const SOURCE = MOTIONS.look_at_left_expressive.keyframes;
const PRINCIPLES = [
  { pose: "look_left_anticipation", name: "Anticipation", what: "a small move the other way first, like winding up before a throw" },
  { pose: "look_left_lean", name: "Lean", what: "the body joins in, so it isn't just the head turning" },
  { pose: "look_left_overshoot", name: "Overshoot", what: "going slightly past the target and settling back, like anything with weight" },
];

/** Build up Orion's glance one animation principle at a time, from a plain turn to the expressive one it uses. */
export default function Anticipation() {
  const [on, setOn] = useState<Record<string, boolean>>({ look_left_anticipation: false, look_left_lean: false, look_left_overshoot: false });
  const frames: Keyframe[] = SOURCE.filter((k) => k.pose === "look_left" || on[k.pose!]);
  const motion: Motion = {
    name: "glance_built_up",
    description: "",
    space: "absolute",
    style: "expressive_turn",
    keyframes: [
      // A plain turn gets the whole time the expressive one takes, so only the shape differs.
      ...frames.map((k) => (frames.length === 1 ? { ...k, duration: SOURCE.reduce((a, b) => a + b.duration, 0) } : k)),
      { pose: "home", target: {}, duration: 1.1, arrival: "settle", hold: 0, marker: null },
    ],
  };
  const home = POSES.home.positions;
  const key = Object.values(on).map(Number).join("");
  const { traj } = useCompiled({ motion, start: { positions: home, velocities: zeros(), anchor: home } }, key);
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { loop: true, active: onScreen });
  const count = Object.values(on).filter(Boolean).length;
  return (
    <figure className="lx" ref={box}>
      <RobotView joints={traj ? stateAt(traj, play.t).positions : home} camera="front" label="Orion glancing to its left" />
      <div className="lx-body">
        {traj && <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} marks={keyframeTimes(traj)} />}
        <ul className="lx-list">
          {PRINCIPLES.map((p) => (
            <li key={p.pose} style={{ gridTemplateColumns: "20px minmax(0,1fr)" }}>
              <input type="checkbox" checked={on[p.pose]} onChange={(e) => setOn({ ...on, [p.pose]: e.target.checked })} aria-label={p.name} />
              <span><b style={{ fontWeight: "normal", color: "var(--ink)" }}>{p.name}</b>: {p.what}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="lx-caption">
        {count === 3 ? "This is look_at_left_expressive, exactly as Orion performs it." : count === 0 ? "A plain turn: correct, but mechanical. Tick the boxes to add each principle." : "Add the rest to get Orion's full glance."}
      </figcaption>
    </figure>
  );
}
