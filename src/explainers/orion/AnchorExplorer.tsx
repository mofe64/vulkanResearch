import { useState } from "react";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { LIMITS, POSES, zeros, type Positions } from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

// The last choice puts the head almost as far up as it goes, so the nod's upward lift no longer fits.
const ANCHORS: { label: string; pose: Positions }[] = [
  { label: "home", pose: POSES.home.positions },
  { label: "look_left", pose: POSES.look_left.positions },
  { label: "home_low", pose: POSES.home_low.positions },
  { label: "head near its limit", pose: { ...POSES.home.positions, head_pitch_joint: LIMITS.head_pitch_joint.lower + 0.08 } },
];

/** One happy bounce, performed around different anchors. Near a limit the whole gesture shrinks evenly. */
export default function AnchorExplorer() {
  const [i, setI] = useState(0);
  const anchor = ANCHORS[i].pose;
  const { traj } = useCompiled({ motion: "speak_react_happy", start: { positions: anchor, velocities: zeros(), anchor } }, String(i));
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { loop: true, active: onScreen });
  const scale = traj?.amplitude_scale ?? 1;

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={traj ? stateAt(traj, play.t).positions : anchor} label={`Orion's happy bounce around ${ANCHORS[i].label}`} />
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Anchor</span>
          {ANCHORS.map((a, k) => (
            <button key={a.label} type="button" className="lx-btn" aria-pressed={i === k} onClick={() => setI(k)}>{a.label}</button>
          ))}
        </div>
        {traj && <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} />}
        <div className="lx-stats">
          <span>Gesture size <b className={scale < 0.999 ? "ex-warn" : ""}>{Math.round(scale * 100)}%</b></span>
        </div>
      </div>
      <figcaption className="lx-caption">
        {scale < 0.999
          ? <>The full bounce would push the head past its limit, so the compiler shrank every joint's part of it to {Math.round(scale * 100)}%. The gesture keeps its shape, just smaller.</>
          : <>The same file, <code>speak_react_happy</code>, works wherever the lamp happens to be: its keyframes say "a little up from here", not "go to this angle".</>}
      </figcaption>
    </figure>
  );
}
