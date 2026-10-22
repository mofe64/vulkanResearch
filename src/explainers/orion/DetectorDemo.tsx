import { useState } from "react";
import "../kit/kit.css";

// What the three detectors might report for one desk scene (an illustration); thresholds and rates are Orion's
// (vision/orion_vision/detector_policy.py).
const FINDS = [
  { kind: "face", label: "face", score: 0.93, box: [250, 40, 90, 100] },
  { kind: "face", label: "face", score: 0.58, box: [470, 70, 50, 56] },
  { kind: "palm", label: "palm", score: 0.81, box: [120, 120, 70, 70] },
  { kind: "object", label: "cup", score: 0.66, box: [400, 220, 60, 70] },
  { kind: "object", label: "book", score: 0.31, box: [60, 250, 120, 50] },
];
const THRESHOLD = { face: 0.75, palm: 0.6, object: 0.4 } as const;
const RATES = {
  cpu: { face: "10 a second (3 while you talk)", palm: "10 a second (3 while you talk)", object: "once a minute" },
  hailo: { face: "15 a second", palm: "15 a second", object: "every 5 seconds" },
};

/** Three detectors each mark what they find with a box and a score; only scores above a threshold count. */
export default function DetectorDemo() {
  const [shift, setShift] = useState(0);
  const [hw, setHw] = useState<"cpu" | "hailo">("cpu");
  return (
    <figure className="lx">
      <div className="lx-body">
        <svg viewBox="0 0 640 360" className="lx-plot" role="img" aria-label="Detections drawn over a desk scene">
          <rect width={640} height={360} fill="#f6f4f0" />
          <rect x={0} y={230} width={640} height={130} fill="#ece7df" />
          {FINDS.map((d, i) => {
            const t = Math.min(0.99, THRESHOLD[d.kind as keyof typeof THRESHOLD] + shift);
            const kept = d.score >= t;
            const [x, y, w, h] = d.box;
            return (
              <g key={i} opacity={kept ? 1 : 0.3}>
                <rect x={x} y={y} width={w} height={h} fill="none" stroke={kept ? "var(--heat)" : "#999"} strokeWidth={2} strokeDasharray={kept ? undefined : "5 4"} />
                <text x={x} y={y - 6} className="lx-axis lx-axis-lg" style={{ fill: kept ? "var(--heat)" : "#999" }}>{d.label} {d.score.toFixed(2)}</text>
              </g>
            );
          })}
        </svg>
        <label className="lx-slider"><span>Be stricter</span><input type="range" min={-0.3} max={0.3} step={0.01} value={shift} onChange={(e) => setShift(Number(e.target.value))} /><output>{shift >= 0 ? "+" : ""}{shift.toFixed(2)}</output></label>
        <table className="lx-table">
          <tbody>
            <tr><th>Faces</th><td>keep above {(THRESHOLD.face + shift).toFixed(2)}</td><td>{RATES[hw].face}</td></tr>
            <tr><th>Palms</th><td>keep above {(THRESHOLD.palm + shift).toFixed(2)}</td><td>{RATES[hw].palm}</td></tr>
            <tr><th>Objects</th><td>keep above {(THRESHOLD.object + shift).toFixed(2)}</td><td>{RATES[hw].object}</td></tr>
          </tbody>
        </table>
        <div className="lx-row">
          <span className="lx-label">Running on</span>
          <button type="button" className="lx-btn" aria-pressed={hw === "cpu"} onClick={() => setHw("cpu")}>the Pi alone</button>
          <button type="button" className="lx-btn" aria-pressed={hw === "hailo"} onClick={() => setHw("hailo")}>with the AI HAT+</button>
        </div>
      </div>
      <figcaption className="lx-caption">Each box is a guess with a score from 0 to 1. Too strict and Orion misses the person at the back; too loose and it sees faces in the wallpaper. The scene is an illustration; the thresholds and rates are Orion's.</figcaption>
    </figure>
  );
}
