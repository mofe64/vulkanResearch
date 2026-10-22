import { useMemo } from "react";
import CurvePlot from "../kit/CurvePlot";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { POSES, deg, zeros, type Motion, type Positions } from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { keyframeTimes, series, useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

const MOVE: Motion = {
  name: "glance_left_and_back",
  description: "Look left, then come back.",
  space: "absolute",
  style: "attentive",
  keyframes: [
    { pose: "look_left", target: {}, duration: 1.2, arrival: "settle", hold: 0, marker: null },
    { pose: "home", target: {}, duration: 1.2, arrival: "settle", hold: 0, marker: null },
  ],
};
const BASE = 0; // base turn, first in Orion's joint order

/**
 * The same glance twice: on the left, straight lines between the keyframes; on the right, Orion's curves. The speed
 * chart shows why the straight version jolts: its speed jumps from zero to full in an instant.
 */
export default function SmoothVsLinear() {
  const home = POSES.home.positions;
  const { traj } = useCompiled({ motion: MOVE, start: { positions: home, velocities: zeros(), anchor: home } }, "glance");
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { loop: true, active: onScreen });

  // The straight-line version: same keyframes at the same times, joined by straight lines.
  const linear = useMemo(() => {
    if (!traj) return null;
    const marks = keyframeTimes(traj);
    const pts: { t: number; q: Positions }[] = [{ t: 0, q: home }];
    pts.push({ t: marks[0].t, q: POSES.look_left.positions }, { t: traj.duration_seconds, q: home });
    const at = (t: number): Positions => {
      const i = Math.max(0, pts.findIndex((p, k) => k > 0 && t <= p.t) - 1);
      const a = pts[i];
      const b = pts[i + 1] ?? a;
      const f = b.t > a.t ? (t - a.t) / (b.t - a.t) : 1;
      return Object.fromEntries(Object.keys(a.q).map((j) => [j, a.q[j as keyof Positions] + (b.q[j as keyof Positions] - a.q[j as keyof Positions]) * f])) as Positions;
    };
    const speed: [number, number][] = [];
    for (let k = 0; k < pts.length - 1; k++) {
      const v = deg((pts[k + 1].q.base_yaw_joint - pts[k].q.base_yaw_joint) / (pts[k + 1].t - pts[k].t || 1));
      speed.push([pts[k].t, 0], [pts[k].t, v], [pts[k + 1].t, v], [pts[k + 1].t, 0]);
    }
    return { at, speed };
  }, [traj]);

  if (!traj || !linear) return <figure className="lx" ref={box}><div className="lx-robot" /></figure>;
  const smooth = stateAt(traj, play.t).positions;

  return (
    <figure className="lx" ref={box}>
      <div className="lx-split">
        <div><span className="lx-label">Straight lines</span><RobotView joints={linear.at(play.t)} camera="front" label="The glance with straight-line movement" /></div>
        <div><span className="lx-label">Orion's curves</span><RobotView joints={smooth} camera="front" label="The glance with Orion's curves" /></div>
      </div>
      <div className="lx-body">
        <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} />
        <CurvePlot
          duration={traj.duration_seconds}
          cursor={play.t}
          yLabel="base turn speed, °/s"
          format={(v) => v.toFixed(0)}
          series={[
            { label: "straight lines", points: linear.speed, tone: "heat" },
            { label: "Orion's curves", points: series(traj, BASE, "velocities", 180 / Math.PI), tone: "ink" },
          ]}
        />
        <div className="lx-legend">
          <span><i className="lx-key lx-heat" />Straight lines: speed jumps instantly</span>
          <span><i className="lx-key lx-ink" />Orion: speed rises and falls gently</span>
        </div>
      </div>
      <figcaption className="lx-caption">
        Both lamps reach the same poses at the same moments. Watch the start and end of each turn: the straight version
        snaps into motion and stops dead, which on a real motor is a jolt you can hear.
      </figcaption>
    </figure>
  );
}
