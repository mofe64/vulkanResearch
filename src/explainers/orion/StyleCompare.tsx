import { useMemo, useState } from "react";
import CurvePlot from "../kit/CurvePlot";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { MOTIONS, POSES, STYLES, cloneMotion, deg, zeros } from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { series, useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

const BASE_MOTION = "look_at_left_expressive";
const FIELDS: [keyof (typeof STYLES)[number], string][] = [
  ["tempo", "speed of travel"],
  ["tangent_tension", "flow through keyframes"],
  ["joint_lag", "joints out of step"],
  ["amplitude", "size of relative moves"],
  ["overshoot_scale", "push past the target"],
  ["settle_character", "time to settle"],
];

/** The same keyframes performed in each of Orion's eight styles. */
export default function StyleCompare() {
  const original = MOTIONS[BASE_MOTION].style;
  const [style, setStyle] = useState(original);
  const home = POSES.home.positions;
  const start = { positions: home, velocities: zeros(), anchor: home };
  const motion = useMemo(() => ({ ...cloneMotion(MOTIONS[BASE_MOTION]), style }), [style]);
  const picked = useCompiled({ motion, start }, style);
  const reference = useCompiled({ motion: BASE_MOTION, start }, "reference");
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(picked.traj, { loop: true, active: onScreen });
  const s = STYLES.find((x) => x.name === style)!;
  const traj = picked.traj;
  const duration = Math.max(traj?.duration_seconds ?? 1, reference.traj?.duration_seconds ?? 1);

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={traj ? stateAt(traj, play.t).positions : home} label={`Orion glancing left in the ${style} style`} />
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Style</span>
          <select className="lx-btn" value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Motion style">
            {STYLES.map((x) => <option key={x.name} value={x.name}>{x.name}{x.name === original ? " (its own)" : ""}</option>)}
          </select>
        </div>
        {traj && <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} />}
        {traj && reference.traj && (
          <>
            <CurvePlot
              duration={duration}
              cursor={play.t}
              yLabel="base turn, °"
              format={(v) => v.toFixed(0)}
              series={[
                { label: original, points: series(reference.traj, 0, "positions", 180 / Math.PI), tone: "soft" },
                { label: style, points: series(traj, 0, "positions", 180 / Math.PI), tone: "heat" },
              ]}
            />
            <div className="lx-legend">
              <span><i className="lx-key lx-soft" />{original} (the motion's own style)</span>
              <span><i className="lx-key lx-heat" />{style}, {traj.duration_seconds.toFixed(2)} s</span>
            </div>
          </>
        )}
        <table className="lx-table">
          <tbody>
            {FIELDS.map(([f, label]) => (
              <tr key={f}><th>{label}</th><td>{(s[f] as number).toFixed(2)}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
      <figcaption className="lx-caption">Peak speed {traj ? deg(traj.peak_velocity_rad_s).toFixed(0) : "–"}°/s. The numbers are the style's settings in Orion's runtime.</figcaption>
    </figure>
  );
}
