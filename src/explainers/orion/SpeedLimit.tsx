import { useState } from "react";
import CurvePlot from "../kit/CurvePlot";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { MAX_SPEED_RAD_S, POSES, deg, zeros, type Motion } from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { series, useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

/** Ask for a left-to-right turn in less and less time, and watch the compiler refuse to go faster than the motor can. */
export default function SpeedLimit() {
  const [asked, setAsked] = useState(1.2);
  const motion: Motion = {
    name: "turn_left_to_right",
    description: "Turn from looking left to looking right.",
    space: "absolute",
    style: "attentive",
    keyframes: [{ pose: "look_right", target: {}, duration: asked, arrival: "settle", hold: 0, marker: null }],
  };
  const left = POSES.look_left.positions;
  const { traj } = useCompiled({ motion, start: { positions: left, velocities: zeros(), anchor: left } }, String(asked));
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { loop: true, active: onScreen });
  const limit = deg(MAX_SPEED_RAD_S);
  const stretched = traj && traj.duration_seconds > asked + 0.02;

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={traj ? stateAt(traj, play.t).positions : left} label="Orion turning from left to right" />
      <div className="lx-body">
        <label className="lx-slider">
          <span>Time asked for</span>
          <input type="range" min={0.1} max={1.6} step={0.05} value={asked} onChange={(e) => setAsked(Number(e.target.value))} />
          <output>{asked.toFixed(2)} s</output>
        </label>
        {traj && (
          <>
            <div className="lx-stats">
              <span>Planned time <b className={stretched ? "ex-warn" : ""}>{traj.duration_seconds.toFixed(2)} s</b></span>
              <span>Top speed <b>{deg(traj.peak_velocity_rad_s).toFixed(0)}°/s</b></span>
              <span>Motor limit <b>{limit.toFixed(0)}°/s</b></span>
            </div>
            <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} />
            <CurvePlot
              duration={Math.max(traj.duration_seconds, 0.5)}
              range={[-20, limit * 1.12]}
              cursor={play.t}
              yLabel="base turn speed, °/s"
              format={(v) => v.toFixed(0)}
              lines={[{ y: limit, label: "motor's top speed" }]}
              series={[{ label: "speed", points: series(traj, 0, "velocities", 180 / Math.PI), tone: "ink" }]}
            />
          </>
        )}
      </div>
      <figcaption className="lx-caption">
        {stretched
          ? <>Too fast for the motors: the compiler stretched the turn from {asked.toFixed(2)} s to {traj!.duration_seconds.toFixed(2)} s so the speed stays under the limit.</>
          : <>Drag the time down. Past a point the motors can't keep up, and the compiler makes the move longer instead of failing.</>}
      </figcaption>
    </figure>
  );
}
