import { useState } from "react";
import CurvePlot from "../kit/CurvePlot";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { POSES, deg, zeros } from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

const SPEEDS = [1, 0.25, 0.05];
const STEPS = ["Read where each motor is", "Work out where it should be now", "Send the five goals"];

/**
 * Slow the glance down until the separate goals show: the smooth curve is really a dot every 20 ms, and each dot is
 * one turn of the runtime's loop.
 */
export default function ControlLoop() {
  const [speed, setSpeed] = useState(0.25);
  const home = POSES.home.positions;
  const { traj } = useCompiled({ motion: "look_at_left_expressive", start: { positions: home, velocities: zeros(), anchor: home } }, "loop");
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { loop: true, speed, active: onScreen });
  if (!traj) return <figure className="lx" ref={box}><div className="lx-robot" /></figure>;
  const now = stateAt(traj, play.t);
  // At slow speeds, show the lamp only where it was last sent, so the jumps are visible.
  const sent = traj.samples[now.tick].positions;
  const phase = Math.floor(((play.t * traj.control_rate_hz) % 1) * 3);
  const dots = traj.samples.filter((s) => s.time_from_start <= play.t).map((s) => [s.time_from_start, deg(s.positions[0])] as [number, number]);
  const whole = traj.samples.map((s) => [s.time_from_start, deg(s.positions[0])] as [number, number]);

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={speed < 1 ? { ...now.positions, ...Object.fromEntries(traj.joint_names.map((j, i) => [j, sent[i]])) } : now.positions} label="Orion glancing left, in slow motion" />
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Speed</span>
          {SPEEDS.map((s) => (
            <button key={s} type="button" className="lx-btn" aria-pressed={speed === s} onClick={() => setSpeed(s)}>{s === 1 ? "real time" : `${s}×`}</button>
          ))}
        </div>
        <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} />
        <CurvePlot
          duration={traj.duration_seconds}
          cursor={play.t}
          yLabel="base turn, °"
          format={(v) => v.toFixed(0)}
          series={[{ label: "plan", points: whole, tone: "soft" }, { label: "goals sent", points: dots, tone: "heat", dots: true }]}
        />
        <ol className="lx-keys" aria-label="One turn of the loop">
          {STEPS.map((s, i) => <li key={s} className={play.playing && speed < 1 && phase === i ? "is-on" : ""}><b>{i + 1}</b><span>{s}</span></li>)}
        </ol>
        <div className="lx-stats">
          <span>Goal number <b>{now.tick + 1}</b> of {traj.samples.length}</span>
          <span>One every <b>20 ms</b></span>
        </div>
      </div>
      <figcaption className="lx-caption">Each orange dot is one set of goals sent to the five motors. At full speed there are 50 a second, too many to see.</figcaption>
    </figure>
  );
}
