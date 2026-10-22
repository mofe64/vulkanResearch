import { useMemo, useState } from "react";
import CurvePlot from "../kit/CurvePlot";
import data from "../../data/orion/servo-tracking.json";
import { JOINT_INFO, deg, type JointName } from "../kit/orion";
import "../kit/kit.css";

const CHOICES: JointName[] = ["head_pitch_joint", "elbow_pitch_joint", "shoulder_pitch_joint"];

/** Commanded vs measured angle from a real run on the lamp, with the delay between them worked out from the data. */
export default function TrackingPlot() {
  const [joint, setJoint] = useState<JointName>("head_pitch_joint");
  const [view, setView] = useState<[number, number]>([2, 5]);
  const d = data.joints[joint];

  // The delay: shift the measured line back sample by sample until it best lines up with the commanded one.
  const lagMs = useMemo(() => {
    let best = 0;
    let bestErr = Infinity;
    for (let s = 0; s < 25; s++) {
      let err = 0;
      for (let i = 0; i + s < d.measured.length; i++) err += (d.measured[i + s] - d.commanded[i]) ** 2;
      err /= d.measured.length - s;
      if (err < bestErr) [best, bestErr] = [s, err];
    }
    return Math.round((best * 1000) / data.update_hz);
  }, [joint]);

  const pts = (values: number[]) =>
    data.t.map((t, i) => [t - view[0], deg(values[i] - d.commanded[0])] as [number, number]).filter(([t]) => t >= 0 && t <= view[1] - view[0]);

  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Joint</span>
          {CHOICES.map((j) => (
            <button key={j} type="button" className="lx-btn" aria-pressed={joint === j} onClick={() => setJoint(j)}>{JOINT_INFO[j].label}</button>
          ))}
          <span className="lx-label" style={{ marginLeft: "auto" }}>Show</span>
          <button type="button" className="lx-btn" aria-pressed={view[1] - view[0] < 4} onClick={() => setView([2, 5])}>3 s</button>
          <button type="button" className="lx-btn" aria-pressed={view[1] - view[0] > 4} onClick={() => setView([0, data.t.at(-1)!])}>whole reply</button>
        </div>
        <CurvePlot
          duration={view[1] - view[0]}
          yLabel={`${JOINT_INFO[joint].label.toLowerCase()}, ° from start`}
          format={(v) => v.toFixed(0)}
          height={220}
          series={[
            { label: "asked", points: pts(d.commanded), tone: "ink" },
            { label: "actual", points: pts(d.measured), tone: "heat" },
          ]}
        />
        <div className="lx-legend">
          <span><i className="lx-key lx-ink" />Asked for (the goals sent)</span>
          <span><i className="lx-key lx-heat" />Actual (read back from the motor)</span>
        </div>
        <div className="lx-stats"><span>The motor trails the plan by about <b>{lagMs} ms</b></span></div>
      </div>
      <figcaption className="lx-caption">Recorded on the real lamp during a spoken reply ({data.source}). The motor follows the plan a little late and doesn't quite reach every peak.</figcaption>
    </figure>
  );
}
