import { useState } from "react";
import CurvePlot from "../kit/CurvePlot";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { POSES, zeros, type Motion } from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { keyframeTimes, series, useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

type Arrival = "through" | "settle";

/** Left, right, home: switch the middle keyframes between stopping at them and flowing through them. */
export default function ArrivalToggle() {
  const [arrivals, setArrivals] = useState<[Arrival, Arrival]>(["settle", "settle"]);
  const motion: Motion = {
    name: "left_right_home",
    description: "Look left, then right, then home.",
    space: "absolute",
    style: "attentive",
    keyframes: [
      { pose: "look_left", target: {}, duration: 0.9, arrival: arrivals[0], hold: 0, marker: null },
      { pose: "look_right", target: {}, duration: 1.3, arrival: arrivals[1], hold: 0, marker: null },
      { pose: "home", target: {}, duration: 0.9, arrival: "settle", hold: 0, marker: null },
    ],
  };
  const home = POSES.home.positions;
  const { traj } = useCompiled({ motion, start: { positions: home, velocities: zeros(), anchor: home } }, arrivals.join());
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { loop: true, active: onScreen });
  const toggle = (i: 0 | 1) => setArrivals((a) => (i === 0 ? [a[0] === "settle" ? "through" : "settle", a[1]] : [a[0], a[1] === "settle" ? "through" : "settle"]));

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={traj ? stateAt(traj, play.t).positions : home} label="Orion looking left, right and home" />
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">At look_left</span>
          <button type="button" className="lx-btn" aria-pressed={arrivals[0] === "through"} onClick={() => toggle(0)}>{arrivals[0]}</button>
          <span className="lx-label" style={{ marginLeft: 12 }}>At look_right</span>
          <button type="button" className="lx-btn" aria-pressed={arrivals[1] === "through"} onClick={() => toggle(1)}>{arrivals[1]}</button>
        </div>
        {traj && (
          <>
            <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} marks={keyframeTimes(traj)} />
            <CurvePlot
              duration={traj.duration_seconds}
              cursor={play.t}
              yLabel="base turn speed, °/s"
              format={(v) => v.toFixed(0)}
              marks={keyframeTimes(traj).map((m, i) => ({ t: m.t, label: ["left", "right", "home"][i] }))}
              series={[{ label: "speed", points: series(traj, 0, "velocities", 180 / Math.PI), tone: "ink" }]}
            />
          </>
        )}
      </div>
      <figcaption className="lx-caption">
        Click <b>settle</b> to make it <b>through</b>. Settling brings the speed to zero at the keyframe: the lamp stops
        there. Passing through keeps it moving, so the speed line crosses the keyframe without touching zero.
      </figcaption>
    </figure>
  );
}
