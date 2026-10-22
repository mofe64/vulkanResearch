import { useMemo, useState } from "react";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import type { CompileRequest } from "../kit/compiler";
import { MOTIONS, POSES, deg, zeros, JOINTS, JOINT_INFO, type Motion, type Positions } from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { keyframeTimes, useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

const POSE_CHOICES = ["home", "attentive", "look_left", "look_right", "home_low", "delight", "rest"];
const MOTION_CHOICES = ["look_at_left_expressive", "delight_lift", "idle_breathe", "speak_emphasis_nod", "speak_react_laugh", "wake_stretch", "yawn"];

/** "Go to this pose" is itself a one-keyframe motion, compiled like any other. */
const goTo = (pose: string): Motion => ({
  name: "go_to_pose",
  description: `Move to ${pose}.`,
  space: "absolute",
  style: "return_home",
  keyframes: [{ pose, target: {}, duration: 0.9, arrival: "settle", hold: 0, marker: null }],
});

const still = (positions: Positions) => ({ positions, velocities: zeros(), anchor: positions });

/**
 * Pick a pose and the lamp travels there; pick a motion and it plays its keyframes in order. The strip underneath
 * lists the motion's keyframes, straight from Orion's motion file, and lights up the one being travelled to.
 */
export default function MotionPlayer() {
  const [from, setFrom] = useState<Positions>({ ...POSES.home.positions });
  const [run, setRun] = useState<{ motion: Motion; n: number }>({ motion: MOTIONS.look_at_left_expressive, n: 0 });
  const request: CompileRequest = { motion: run.motion.name === "go_to_pose" ? run.motion : run.motion.name, start: still(from) };
  const { traj, error } = useCompiled(request, `${run.motion.name}-${run.n}`);
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { active: onScreen });
  const now = traj ? stateAt(traj, play.t) : null;
  const marks = useMemo(() => (traj ? keyframeTimes(traj) : []), [traj]);
  const q = now?.positions ?? from;

  // Start each new movement from wherever the lamp is now.
  const start = (motion: Motion) => {
    setFrom({ ...q });
    setRun({ motion, n: run.n + 1 });
  };

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={q} label={`Orion playing ${run.motion.name}`} />
      <div className="lx-body">
        {traj && <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} marks={marks} />}
        <div className="lx-row">
          <span className="lx-label">Go to pose</span>
          {POSE_CHOICES.map((p) => (
            <button key={p} type="button" className="lx-btn" onClick={() => start(goTo(p))}
              aria-pressed={run.motion.name === "go_to_pose" && run.motion.keyframes[0].pose === p}>{p}</button>
          ))}
        </div>
        <div className="lx-row">
          <span className="lx-label">Play motion</span>
          {MOTION_CHOICES.map((m) => (
            <button key={m} type="button" className="lx-btn" onClick={() => start(MOTIONS[m])} aria-pressed={run.motion.name === m}>{m}</button>
          ))}
        </div>
        <ol className="lx-keys" aria-label="Keyframes">
          {run.motion.keyframes.map((k, i) => (
            <li key={i} className={now?.keyframe === i ? "is-on" : ""}>
              <b>{i + 1}</b>
              <span>{k.pose ?? describeOffsets(k.target)}</span>
              <span className="lx-note">{k.duration.toFixed(2)} s · {k.arrival}</span>
            </li>
          ))}
        </ol>
        {error && <p className="lx-error">{error}</p>}
      </div>
      <figcaption className="lx-caption">
        {run.motion.description} {run.motion.space === "anchor_relative" ? "Its keyframes are small offsets from where the lamp is." : "Each keyframe names a pose."}
      </figcaption>
    </figure>
  );
}

function describeOffsets(target: Partial<Positions>) {
  const moved = JOINTS.filter((j) => target[j]);
  if (!moved.length) return "back to the start";
  return moved.map((j) => `${JOINT_INFO[j].label.toLowerCase()} ${target[j]! > 0 ? "+" : ""}${deg(target[j]!).toFixed(0)}°`).join(", ");
}
