import { useState } from "react";
import "../kit/kit.css";

type Hw = "cpu" | "hailo";
type Kind = "face" | "palm" | "object";

// Score thresholds and rates are Orion's (vision/orion_vision/detector_policy.py). YuNet on the CPU and SCRFD on the
// Hailo chip score faces on different scales, so each has its own face threshold. The scene and its scores are an
// illustration.
const THRESHOLD: Record<Hw, Record<Kind, number>> = {
  cpu: { face: 0.75, palm: 0.6, object: 0.4 },
  hailo: { face: 0.5, palm: 0.6, object: 0.4 },
};
const RATES = {
  cpu: { face: "10 a second (3 while you talk)", palm: "10 a second (3 while you talk)", object: "once a minute" },
  hailo: { face: "15 a second", palm: "15 a second", object: "every 5 seconds" },
};

type Find = { id: string; kind: Kind; label: string; score: Record<Hw, number>; box: [number, number, number, number]; fake?: boolean };
const FINDS: Find[] = [
  { id: "near", kind: "face", label: "face", score: { cpu: 0.94, hailo: 0.86 }, box: [252, 80, 96, 102] },
  { id: "far", kind: "face", label: "face", score: { cpu: 0.79, hailo: 0.55 }, box: [478, 96, 44, 50] },
  { id: "picture", kind: "face", label: "face", score: { cpu: 0.42, hailo: 0.29 }, box: [62, 60, 46, 50], fake: true },
  { id: "palm", kind: "palm", label: "palm", score: { cpu: 0.81, hailo: 0.81 }, box: [158, 96, 62, 72] },
  { id: "cup", kind: "object", label: "cup", score: { cpu: 0.66, hailo: 0.66 }, box: [410, 262, 66, 64] },
  { id: "book", kind: "object", label: "book", score: { cpu: 0.52, hailo: 0.52 }, box: [82, 290, 146, 42] },
];

const INK = "#3b3632";
const MUTED = "#a8a29b";

/** The desk scene, drawn in ink lines: two people, a raised hand, a cup, a book and a picture on the wall. */
function Scene() {
  const line = { fill: "#fff", stroke: INK, strokeWidth: 1.5, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  return (
    <g>
      <rect width={640} height={244} fill="#f8f6f2" />
      {/* faint wallpaper stripes */}
      {[200, 230, 600, 630].map((x) => <line key={x} x1={x} x2={x} y1={0} y2={244} stroke="#ece7df" />)}
      <rect y={244} width={640} height={116} fill="#efebe4" />
      <line x1={0} x2={640} y1={244} y2={244} stroke={INK} strokeWidth={1} />

      {/* framed picture: a drawn face that a detector can mistake for a real one */}
      <rect x={34} y={24} width={102} height={104} {...line} />
      <rect x={41} y={31} width={88} height={90} fill="none" stroke={INK} strokeWidth={0.8} />
      <circle cx={85} cy={86} r={18} fill="none" stroke={INK} strokeWidth={1.2} />
      <circle cx={79} cy={82} r={1.8} fill={INK} />
      <circle cx={91} cy={82} r={1.8} fill={INK} />
      <path d="M 79 92 Q 85 97 91 92" fill="none" stroke={INK} strokeWidth={1.2} />

      {/* the person further back */}
      <path d="M 468 244 Q 470 176 500 172 Q 530 176 532 244" {...line} />
      <line x1={500} y1={138} x2={500} y2={172} stroke={INK} strokeWidth={1.5} />
      <circle cx={500} cy={120} r={19} {...line} />

      {/* the person at the desk, with a raised hand */}
      <path d="M 232 214 L 196 160" {...line} strokeWidth={9} stroke={INK} />
      <path d="M 232 214 L 196 160" fill="none" stroke="#fff" strokeWidth={6} strokeLinecap="round" />
      <path d="M 176 160 L 174 122 M 184 158 L 182 110 M 194 158 L 194 108 M 204 160 L 206 114 M 211 166 L 220 144" fill="none" stroke={INK} strokeWidth={8} strokeLinecap="round" />
      <path d="M 176 160 L 174 122 M 184 158 L 182 110 M 194 158 L 194 108 M 204 160 L 206 114 M 211 166 L 220 144" fill="none" stroke="#fff" strokeWidth={5} strokeLinecap="round" />
      <rect x={174} y={146} width={40} height={24} rx={9} fill="#fff" />
      <path d="M 220 244 Q 222 194 300 188 Q 378 194 380 244" {...line} />
      <line x1={300} y1={176} x2={300} y2={188} stroke={INK} strokeWidth={1.5} />
      <circle cx={300} cy={132} r={44} {...line} />
      <circle cx={285} cy={128} r={2.2} fill={INK} />
      <circle cx={315} cy={128} r={2.2} fill={INK} />
      <path d="M 290 152 Q 300 157 310 152" fill="none" stroke={INK} strokeWidth={1.3} />

      {/* cup and book on the desk */}
      <path d="M 418 272 L 422 320 L 456 320 L 460 272 Z" {...line} />
      <path d="M 459 282 Q 474 284 472 298 Q 470 308 457 308" fill="none" stroke={INK} strokeWidth={1.5} />
      <path d="M 94 300 L 204 300 L 222 314 L 112 314 Z" {...line} />
      <path d="M 112 314 L 222 314 L 222 326 L 112 326 Z" {...line} />
      <path d="M 94 300 L 94 312 L 112 326 L 112 314 Z" {...line} />
      <line x1={116} x2={218} y1={318} y2={318} stroke="#d8d2c8" strokeWidth={1} />
      <line x1={116} x2={218} y1={322} y2={322} stroke="#d8d2c8" strokeWidth={1} />
    </g>
  );
}

/** Three detectors each mark what they find with a box and a score; only scores above a threshold count. */
export default function DetectorDemo() {
  const [shift, setShift] = useState(0);
  const [hw, setHw] = useState<Hw>("cpu");
  const limit = (k: Kind) => Math.min(0.99, Math.max(0.05, THRESHOLD[hw][k] + shift));
  const kept = (f: Find) => f.score[hw] >= limit(f.kind);

  const faces = FINDS.filter((f) => f.kind === "face" && kept(f));
  const missedFar = !kept(FINDS[1]);
  const fake = kept(FINDS[2]);
  let verdict = `Orion counts ${faces.length === 1 ? "one face" : `${faces.length} faces`}.`;
  if (missedFar) verdict += " It misses the person at the back.";
  if (fake) verdict += " One of them is the picture on the wall.";
  if (!missedFar && !fake) verdict += " Both people, and nothing else.";

  return (
    <figure className="lx">
      <div className="lx-body">
        <svg viewBox="0 0 640 360" className="lx-plot" role="img" aria-label="Detections drawn over a desk scene with two people, a raised hand, a cup, a book and a picture on the wall">
          <Scene />
          {FINDS.map((f) => {
            const on = kept(f);
            const [x, y, w, h] = f.box;
            const colour = on ? "var(--heat)" : MUTED;
            return (
              <g key={f.id}>
                <rect x={x} y={y} width={w} height={h} fill="none" stroke={colour} strokeWidth={on ? 2 : 1.5} strokeDasharray={on ? undefined : "5 4"} />
                <text x={x} y={y - 6} className="lx-axis lx-axis-lg" style={{ fill: colour }}>{f.label} {f.score[hw].toFixed(2)}</text>
                {f.fake && on && (
                  <text x={x - 26} y={146} className="lx-axis lx-axis-lg" style={{ fill: INK }}>✕ not a person</text>
                )}
              </g>
            );
          })}
        </svg>
        <p className="lx-card">{verdict}</p>
        <label className="lx-slider"><span>Be stricter</span><input type="range" min={-0.4} max={0.25} step={0.01} value={shift} onChange={(e) => setShift(Number(e.target.value))} /><output>{shift >= 0 ? "+" : ""}{shift.toFixed(2)}</output></label>
        <div className="lx-row">
          <span className="lx-label">Running on</span>
          <button type="button" className="lx-btn" aria-pressed={hw === "cpu"} onClick={() => setHw("cpu")}>the Pi alone</button>
          <button type="button" className="lx-btn" aria-pressed={hw === "hailo"} onClick={() => setHw("hailo")}>with the AI HAT+</button>
        </div>
        <table className="lx-table">
          <tbody>
            <tr><th>Faces</th><td style={{ whiteSpace: "nowrap", paddingInline: 10 }}>keep above {limit("face").toFixed(2)}</td><td>{RATES[hw].face}</td></tr>
            <tr><th>Palms</th><td style={{ whiteSpace: "nowrap", paddingInline: 10 }}>keep above {limit("palm").toFixed(2)}</td><td>{RATES[hw].palm}</td></tr>
            <tr><th>Objects</th><td style={{ whiteSpace: "nowrap", paddingInline: 10 }}>keep above {limit("object").toFixed(2)}</td><td>{RATES[hw].object}</td></tr>
          </tbody>
        </table>
      </div>
      <figcaption className="lx-caption">Each box is a guess with a score from 0 to 1. Too strict and Orion misses the person at the back; too loose and it sees a face in the picture on the wall. The two face models score on different scales, so each has its own threshold. The scene and scores are an illustration; the thresholds and rates are Orion's.</figcaption>
    </figure>
  );
}
