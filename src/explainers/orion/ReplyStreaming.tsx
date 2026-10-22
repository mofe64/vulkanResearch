import { useState } from "react";
import "../kit/kit.css";

const CHUNKS = [1.6, 2.1, 1.4, 1.9, 1.2]; // seconds of speech in each piece of the reply (an illustration)
const RESERVE = 0.6; // seconds of audio to have ready before starting (illustrative)

/**
 * Orion speaks a reply while it is still being synthesised, piece by piece. That works while synthesis is faster
 * than speech; when it isn't, Orion switches to waiting for the whole reply instead of stuttering.
 */
export default function ReplyStreaming() {
  const [speed, setSpeed] = useState(3); // seconds of speech made per second of work
  const make = CHUNKS.map((d) => d / speed);
  const ready: number[] = [];
  make.reduce((t, m, i) => ((ready[i] = t + m), t + m), 0);
  const total = CHUNKS.reduce((a, b) => a + b, 0);
  // Streaming: start once the first piece is in, then play each piece when the previous ends, if it's ready.
  const startStream = Math.max(ready[0], RESERVE / speed);
  let t = startStream;
  let gaps = 0;
  const play = CHUNKS.map((d, i) => {
    const s = Math.max(t, ready[i]);
    if (s > t + 1e-6) gaps++;
    t = s + d;
    return [s, s + d];
  });
  const buffered = gaps > 0;
  // Orion's choice: if synthesis is too slow it waits for the whole reply, then plays it without gaps.
  const start = buffered ? ready[ready.length - 1] : startStream;
  const shown = buffered ? CHUNKS.map((d, i) => { const s = start + CHUNKS.slice(0, i).reduce((a, b) => a + b, 0); return [s, s + d]; }) : play;
  const end = Math.max(...shown.map((p) => p[1]), ready[ready.length - 1]);
  const X = (s: number) => 110 + (s / end) * 480;
  return (
    <figure className="lx">
      <div className="lx-body">
        <svg className="lx-plot" viewBox="0 0 600 128" role="img" aria-label="Synthesis and playback timeline for a reply">
          <text x={0} y={34} className="lx-axis">Piper making voice</text>
          {make.map((m, i) => <rect key={i} x={X(ready[i] - m)} y={22} width={Math.max(1, X(ready[i]) - X(ready[i] - m) - 1)} height={18} rx={2} fill="#d8d4ce" />)}
          <text x={0} y={74} className="lx-axis">Speaker playing</text>
          {shown.map(([s, e], i) => <rect key={i} x={X(s)} y={62} width={X(e) - X(s) - 1} height={18} rx={2} fill="var(--heat)" fillOpacity={0.75} />)}
          <line x1={X(0)} x2={X(0)} y1={14} y2={90} className="lx-markline" />
          <text x={X(0)} y={102} className="lx-axis">↑ reply text ready</text>
          <text x={X(start)} y={122} className="lx-axis lx-limit-text">↑ first sound after {start.toFixed(1)} s</text>
        </svg>
        <label className="lx-slider">
          <span>Synthesis speed</span>
          <input type="range" min={0.6} max={6} step={0.1} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <output>{speed.toFixed(1)}×</output>
        </label>
      </div>
      <figcaption className="lx-caption">
        {buffered
          ? "Too slow to keep up: playing as it goes would leave gaps mid-sentence, so Orion waits for the whole reply and plays it in one go."
          : "Faster than speech: Orion starts talking once the first piece is ready and the rest arrives in time. Drag the speed below 1× to see what changes."}
        {` The reply here is ${total.toFixed(1)} s of speech; the numbers are illustrations.`}
      </figcaption>
    </figure>
  );
}
