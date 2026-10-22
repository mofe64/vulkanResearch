import { useMemo, useState } from "react";
import CurvePlot from "../kit/CurvePlot";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { compileMotion, type Trajectory } from "../kit/compiler";
import {
  JOINT_INFO, JOINTS, JOINTS_BASE_UP, LIMITS, MOTIONS, POSES, STYLES, deg, motionYaml, zeros,
  type JointName, type Motion, type Positions,
} from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { keyframeTimes } from "../kit/useCompiled";
import "../kit/kit.css";

interface Frame {
  pose: Positions;
  duration: number;
  arrival: "through" | "settle";
}

const STARTERS = Object.values(MOTIONS).filter((m) => m.space === "absolute" && m.keyframes.length > 1);
const home = POSES.home.positions;
const poseName = (i: number) => `my_pose_${i + 1}`;

/** The reader's keyframes as an Orion motion file plus the poses it names. */
function toMotion(frames: Frame[], style: string): { motion: Motion; poses: Record<string, Positions> } {
  return {
    motion: {
      name: "my_motion",
      description: "Made in the Vulkan Research lesson.",
      space: "absolute",
      style,
      keyframes: frames.map((f, i) => ({ pose: poseName(i), target: {}, duration: f.duration, arrival: f.arrival, hold: 0, marker: null })),
    },
    poses: Object.fromEntries(frames.map((f, i) => [poseName(i), f.pose])),
  };
}

/**
 * Make a motion: pose the lamp with the sliders, add it as a keyframe, repeat, then play. It is compiled by Orion's
 * own compiler, so anything it refuses or changes is exactly what the real lamp would do.
 */
export default function MotionLab() {
  const [q, setQ] = useState<Positions>({ ...home });
  const [frames, setFrames] = useState<Frame[]>([
    { pose: { ...POSES.look_left.positions }, duration: 0.8, arrival: "through" },
    { pose: { ...POSES.delight.positions }, duration: 0.7, arrival: "through" },
    { pose: { ...home }, duration: 0.9, arrival: "settle" },
  ]);
  const [selected, setSelected] = useState<number | null>(null);
  const [style, setStyle] = useState("attentive");
  const [traj, setTraj] = useState<Trajectory | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { active: onScreen });
  const showing = traj && (play.playing || play.t > 0) ? stateAt(traj, play.t).positions : q;
  const file = useMemo(() => toMotion(frames, style), [frames, style]);

  const edit = (patch: Partial<Frame>) => {
    if (selected === null) return;
    setFrames(frames.map((f, i) => (i === selected ? { ...f, ...patch } : f)));
  };
  const pose = (next: Positions) => {
    play.pause();
    play.seek(0);
    setTraj(null);
    setQ(next);
  };
  const compile = async () => {
    setBusy(true);
    try {
      setTraj(await compileMotion({ ...file, start: { positions: home, velocities: zeros(), anchor: home } }));
      setError(null);
    } catch (e) {
      setTraj(null);
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const loadStarter = (name: string) => {
    const m = MOTIONS[name];
    setFrames(m.keyframes.map((k) => ({ pose: { ...POSES[k.pose!].positions }, duration: k.duration, arrival: k.arrival })));
    setStyle(m.style);
    setSelected(null);
    setTraj(null);
  };

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={showing} label="Your motion on Orion's 3D model" />
      <div className="lx-body">
        <div className="lx-sliders">
          {JOINTS_BASE_UP.map((j: JointName) => (
            <label key={j} className="lx-slider">
              <span>{JOINT_INFO[j].label}</span>
              <input type="range" min={LIMITS[j].lower} max={LIMITS[j].upper} step={0.005} value={q[j]}
                onChange={(e) => pose({ ...q, [j]: Number(e.target.value) })} />
              <output>{deg(q[j]).toFixed(0)}°</output>
            </label>
          ))}
        </div>

        <div className="lx-row">
          <button type="button" className="lx-btn" onClick={() => { setFrames([...frames, { pose: { ...q }, duration: 0.8, arrival: "settle" }]); setSelected(frames.length); }}>
            + Add this pose as keyframe {frames.length + 1}
          </button>
          {selected !== null && (
            <button type="button" className="lx-btn" onClick={() => edit({ pose: { ...q } })}>Use this pose for keyframe {selected + 1}</button>
          )}
        </div>

        <ol className="lx-keys" aria-label="Your keyframes">
          {frames.map((f, i) => (
            <li key={i} className={selected === i ? "is-on" : ""}>
              <button type="button" className="lx-chip" onClick={() => { setSelected(selected === i ? null : i); pose({ ...f.pose }); }}>
                <b>{i + 1}</b> {f.duration.toFixed(2)} s · {f.arrival}
              </button>
            </li>
          ))}
        </ol>

        {selected !== null && frames[selected] && (
          <div className="lx-edit">
            <label className="lx-slider">
              <span>Travel time</span>
              <input type="range" min={0.1} max={3} step={0.05} value={frames[selected].duration} onChange={(e) => edit({ duration: Number(e.target.value) })} />
              <output>{frames[selected].duration.toFixed(2)} s</output>
            </label>
            <div className="lx-row">
              <span className="lx-label">Arrival</span>
              {(["through", "settle"] as const).map((a) => (
                <button key={a} type="button" className="lx-btn" aria-pressed={frames[selected].arrival === a} onClick={() => edit({ arrival: a })}>{a}</button>
              ))}
              <button type="button" className="lx-btn" style={{ marginLeft: "auto" }} onClick={() => { setFrames(frames.filter((_, i) => i !== selected)); setSelected(null); }}>
                Remove keyframe {selected + 1}
              </button>
            </div>
          </div>
        )}

        <div className="lx-row">
          <span className="lx-label">Style</span>
          <select className="lx-btn" value={style} onChange={(e) => setStyle(e.target.value)} aria-label="Motion style">
            {STYLES.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
          <span className="lx-label">Start from</span>
          <select className="lx-btn" value="" onChange={(e) => e.target.value && loadStarter(e.target.value)} aria-label="Load one of Orion's motions">
            <option value="">one of Orion's motions…</option>
            {STARTERS.map((m) => <option key={m.name}>{m.name}</option>)}
          </select>
          <button type="button" className="lx-btn is-primary" style={{ marginLeft: "auto" }} disabled={busy || frames.length === 0} onClick={compile}>
            {busy ? "Compiling…" : "Compile and play"}
          </button>
        </div>

        {error && <p className="lx-error"><b>Orion refused this motion:</b> {error}</p>}
        {traj && (
          <>
            <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} marks={keyframeTimes(traj)} />
            <CurvePlot
              duration={traj.duration_seconds}
              cursor={play.t}
              yLabel="joint angles, °"
              format={(v) => v.toFixed(0)}
              marks={keyframeTimes(traj).map((m) => ({ t: m.t, label: m.label }))}
              series={JOINTS.map((j, i) => ({
                label: JOINT_INFO[j].label,
                points: traj.samples.map((s) => [s.time_from_start, deg(s.positions[i])] as [number, number]),
                tone: (["heat", "ink", "link", "soft", "soft"] as const)[i],
                dashed: i === 4,
              }))}
            />
            <div className="lx-stats">
              <span>Length <b>{traj.duration_seconds.toFixed(2)} s</b></span>
              <span>Top speed <b>{deg(traj.peak_velocity_rad_s).toFixed(0)}°/s</b></span>
              <span>Goals sent <b>{traj.samples.length}</b></span>
            </div>
          </>
        )}

        <details className="lx-file">
          <summary>See it as Orion's motion file</summary>
          <pre>{motionYaml(file.motion)}{"\n# poses.yaml additions\n"}{Object.entries(file.poses).map(([n, p]) => `  ${n}:\n    positions: {${JOINTS.map((j) => `${j}: ${p[j].toFixed(4)}`).join(", ")}}\n`).join("")}</pre>
        </details>
      </div>
      <figcaption className="lx-caption">
        The lamp starts at <code>home</code>. Every keyframe needs a pose and a travel time; the last one must settle.
        Try making it fast, or ending on "through", and see what the compiler says.
      </figcaption>
    </figure>
  );
}
