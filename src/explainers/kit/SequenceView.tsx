import { useEffect, useState } from "react";
import RobotView from "./RobotView";
import { POSES, zeros, type Motion, type Positions } from "./orion";
import { stateAt, useOnScreen, usePlayback } from "./playback";
import { useCompiled } from "./useCompiled";
import "./kit.css";

export interface SequenceStep {
  label: string;
  /** A motion to play from where the previous step ended, or a pause of `wait` seconds holding still. */
  motion?: string | Motion;
  wait?: number;
  /** The lamp's light during this step, 0 (off) to 1, shown as a glow behind the head. */
  light?: number;
  note?: string;
}

interface Props {
  steps: SequenceStep[];
  start?: Positions;
  /** The anchor that relative motions move around. */
  anchor?: Positions;
  camera?: "three-quarter" | "front" | "side";
  caption: string;
}

/** Plays several of Orion's motions one after another, each starting where the last one ended, then starts over. */
export default function SequenceView({ steps, start = POSES.home.positions, anchor = POSES.home.positions, camera, caption }: Props) {
  const [i, setI] = useState(0);
  const [from, setFrom] = useState<Positions>(start);
  const [n, setN] = useState(0);
  const [box, onScreen] = useOnScreen();
  const step = steps[i];
  const { traj } = useCompiled(
    step.motion ? { motion: step.motion, start: { positions: from, velocities: zeros(), anchor } } : null,
    `${i}-${n}`,
  );
  const play = usePlayback(step.motion ? traj : null, { active: onScreen });
  const q = step.motion && traj ? stateAt(traj, play.t).positions : from;

  const advance = () => {
    const next = (i + 1) % steps.length;
    setFrom(next === 0 ? start : { ...q });
    setI(next);
    setN((x) => x + 1);
  };
  // A motion step ends when its playback finishes; a pause ends after its time.
  useEffect(() => {
    if (!onScreen) return;
    if (step.motion && traj && !play.playing && play.t >= traj.duration_seconds - 1e-3) {
      const t = setTimeout(advance, 400);
      return () => clearTimeout(t);
    }
    if (!step.motion) {
      const t = setTimeout(advance, (step.wait ?? 1) * 1000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play.playing, traj, i, n, onScreen]);

  const light = step.light;
  return (
    <figure className="lx" ref={box}>
      <div className="lx-glow-wrap">
        {light !== undefined && <div className="lx-glow" style={{ opacity: 0.15 + 0.6 * light }} aria-hidden="true" />}
        <RobotView joints={q} camera={camera} label={`Orion: ${step.label}`} />
      </div>
      <div className="lx-body">
        <ol className="lx-keys" aria-label="Sequence">
          {steps.map((s, k) => (
            <li key={k} className={k === i ? "is-on" : ""}>
              <button type="button" className="lx-chip" onClick={() => { setFrom(k === 0 ? start : from); setI(k); setN((x) => x + 1); }}>
                <b>{k + 1}</b> {s.label}
              </button>
            </li>
          ))}
        </ol>
        {step.note && <p className="lx-card">{step.note}</p>}
      </div>
      <figcaption className="lx-caption">{caption}</figcaption>
    </figure>
  );
}
