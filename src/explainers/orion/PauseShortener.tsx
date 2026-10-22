import { useState } from "react";
import "../kit/kit.css";

// A made-up recording: speech and the pauses between phrases, in seconds.
const CLIP: { speech: boolean; d: number; w?: string }[] = [
  { speech: true, d: 0.8, w: "Hey Orion" },
  { speech: false, d: 0.5 },
  { speech: true, d: 1.1, w: "remind me to" },
  { speech: false, d: 1.6 },
  { speech: true, d: 0.9, w: "um, call Ada" },
  { speech: false, d: 0.9 },
  { speech: true, d: 0.7, w: "at six" },
];
const LONG = 0.6; // pauses longer than this...
const SHORT = 0.32; // ...become this long (docs/voice-architecture.md)

/** Long pauses are cut down before recognition; the speech itself is untouched and stays in order. */
export default function PauseShortener() {
  const [shortened, setShortened] = useState(true);
  const after = CLIP.map((c) => ({ ...c, d: !c.speech && c.d > LONG && shortened ? SHORT : c.d }));
  const total = (clip: typeof CLIP) => clip.reduce((a, c) => a + c.d, 0);
  const before = total(CLIP);
  const X = (t: number) => 10 + (t / before) * 580;
  const bar = (clip: typeof CLIP, y: number) => {
    let t = 0;
    return clip.map((c, i) => {
      const x0 = X(t);
      t += c.d;
      return (
        <g key={i}>
          <rect x={x0} y={y} width={X(t) - x0 - 1} height={22} rx={3} fill={c.speech ? "#3b3632" : "#f2f2f2"} stroke={c.speech ? "none" : "#d8d4ce"} />
          {c.w && <text x={x0 + 4} y={y + 15} className="lx-axis" fill="#fff" style={{ fill: "#fff" }}>{c.w}</text>}
          {!c.speech && <text x={(x0 + X(t)) / 2} y={y + 36} textAnchor="middle" className="lx-axis">{c.d.toFixed(2)}s</text>}
        </g>
      );
    });
  };
  return (
    <figure className="lx">
      <div className="lx-body">
        <svg className="lx-plot" viewBox="0 0 600 150" role="img" aria-label="A recording before and after long pauses are shortened">
          <text x={10} y={14} className="lx-axis">AS RECORDED · {before.toFixed(1)} s</text>
          {bar(CLIP, 20)}
          <text x={10} y={92} className="lx-axis">SENT TO SPEECH RECOGNITION · {total(after).toFixed(1)} s</text>
          {bar(after, 98)}
        </svg>
        <label className="lx-switch">
          <input type="checkbox" checked={shortened} onChange={(e) => setShortened(e.target.checked)} />
          Shorten pauses longer than 0.6 s to 0.32 s
        </label>
      </div>
      <figcaption className="lx-caption">Less silence means less audio for the speech model to work through, so the answer comes sooner. Short pauses, which carry the rhythm of speech, are left alone.</figcaption>
    </figure>
  );
}
