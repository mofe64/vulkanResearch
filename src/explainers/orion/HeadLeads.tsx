import { useState } from "react";
import CurvePlot from "../kit/CurvePlot";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { POSES, zeros, type Motion } from "../kit/orion";
import { stateAt, useOnScreen, usePlayback } from "../kit/playback";
import { useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

// Two versions of the same lean toward the desk, made for this lesson and compiled by Orion's compiler.
const kf = (offsets: Record<string, number>, duration: number, arrival: "through" | "settle" = "through") =>
  ({ pose: null, target: offsets, duration, arrival, hold: 0, marker: null });
const VERSIONS: Record<string, { label: string; motion: Motion; note: string }> = {
  together: {
    label: "All at once",
    note: "Every joint starts, peaks and stops together. It reads as one stiff object tipping over.",
    motion: {
      name: "lean_together", description: "", space: "anchor_relative", style: "speaking_calm",
      keyframes: [kf({ head_pitch_joint: 0.18, shoulder_pitch_joint: 0.12, elbow_pitch_joint: -0.14 }, 0.6), kf({}, 0.7, "settle")],
    },
  },
  leads: {
    label: "Head leads, body follows",
    note: "The head moves first and furthest; the shoulder and elbow follow a beat later, smaller. It reads as attention: Orion looks, then leans in.",
    motion: {
      name: "lean_head_leads", description: "", space: "anchor_relative", style: "speaking_calm",
      keyframes: [kf({ head_pitch_joint: 0.18 }, 0.3), kf({ head_pitch_joint: 0.16, shoulder_pitch_joint: 0.06, elbow_pitch_joint: -0.07 }, 0.35), kf({}, 0.7, "settle")],
    },
  },
};
const JOINT_LINES = [
  { i: 4, label: "Head nod", tone: "heat" as const },
  { i: 1, label: "Shoulder", tone: "ink" as const },
  { i: 2, label: "Elbow", tone: "link" as const },
];

/** The same lean two ways: all joints together, or the head first and the body after. */
export default function HeadLeads() {
  const [v, setV] = useState<keyof typeof VERSIONS>("together");
  const home = POSES.home.positions;
  const { traj } = useCompiled({ motion: VERSIONS[v].motion, start: { positions: home, velocities: zeros(), anchor: home } }, v);
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { loop: true, active: onScreen });
  // Each joint's movement as a share of its own biggest movement, so the timing is easy to compare.
  const lines = traj
    ? JOINT_LINES.map(({ i, label, tone }) => {
        const start = traj.samples[0].positions[i];
        const peak = Math.max(...traj.samples.map((s) => Math.abs(s.positions[i] - start))) || 1;
        return { label, tone, points: traj.samples.map((s) => [s.time_from_start, (Math.abs(s.positions[i] - start) / peak) * 100] as [number, number]) };
      })
    : [];
  return (
    <figure className="lx" ref={box}>
      <RobotView joints={traj ? stateAt(traj, play.t).positions : home} camera="side" label={`Orion leaning in: ${VERSIONS[v].label}`} />
      <div className="lx-body">
        <div className="lx-row">
          {Object.entries(VERSIONS).map(([k, x]) => (
            <button key={k} type="button" className="lx-btn" aria-pressed={v === k} onClick={() => setV(k as keyof typeof VERSIONS)}>{x.label}</button>
          ))}
        </div>
        {traj && (
          <>
            <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} />
            <CurvePlot duration={traj.duration_seconds} cursor={play.t} range={[0, 105]} yLabel="% of each joint's move" format={(y) => y.toFixed(0)} series={lines} height={170} />
            <div className="lx-legend">{JOINT_LINES.map((l) => <span key={l.label}><i className={`lx-key lx-${l.tone}`} />{l.label}</span>)}</div>
          </>
        )}
        <p className="lx-card">{VERSIONS[v].note}</p>
      </div>
      <figcaption className="lx-caption">Two leans made for this lesson, run through Orion's own compiler. Orion's speech planner applies the same rule to the gestures it plans while talking.</figcaption>
    </figure>
  );
}
