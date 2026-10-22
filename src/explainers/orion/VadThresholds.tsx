import { useMemo, useState } from "react";
import "../kit/kit.css";

const N = 300; // one point every 20 ms: six seconds
const DT = 0.02;
const TRAILING_SILENCE = 1.2; // seconds of silence that end the recording (Orion's managed listener)

/** A made-up “is this speech?” score for someone saying two phrases with a pause, plus some noise. */
function makeTrace() {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: N }, (_, i) => {
    const t = i * DT;
    const speech = (t > 0.6 && t < 2.2) || (t > 2.75 && t < 4.1) ? 0.78 : 0.18;
    const wobble = Math.sin(t * 9) * 0.13 + (rand() - 0.5) * 0.28;
    return Math.min(1, Math.max(0, speech + wobble));
  });
}

/** Two thresholds: start counting speech above one, stop only below a lower one. Make them equal and it flickers. */
export default function VadThresholds() {
  const trace = useMemo(makeTrace, []);
  const [enter, setEnter] = useState(0.5);
  const [leave, setLeave] = useState(0.35);
  const { speaking, switches, endAt } = useMemo(() => {
    let on = false;
    let switches = 0;
    let quiet = 0;
    let endAt: number | null = null;
    const speaking = trace.map((p, i) => {
      const next = p >= (on ? Math.min(leave, enter) : enter);
      if (next !== on) switches++;
      on = next;
      quiet = on ? 0 : quiet + DT;
      if (endAt === null && i * DT > 1 && quiet >= TRAILING_SILENCE) endAt = i * DT;
      return on;
    });
    return { speaking, switches, endAt };
  }, [trace, enter, leave]);

  const X = (i: number) => 30 + (i / N) * 560;
  const Y = (p: number) => 110 - p * 90;
  return (
    <figure className="lx">
      <div className="lx-body">
        <svg className="lx-plot" viewBox="0 0 600 150" role="img" aria-label="Speech score over time with start and stop thresholds">
          {speaking.map((on, i) => on && <rect key={i} x={X(i)} y={120} width={560 / N + 0.5} height={10} fill="#3b3632" />)}
          <text x={30} y={145} className="lx-axis">counted as speech (black)</text>
          <polyline className="lx-line lx-soft" points={trace.map((p, i) => `${X(i)},${Y(p)}`).join(" ")} />
          <line x1={30} x2={590} y1={Y(enter)} y2={Y(enter)} className="lx-limit" />
          <text x={592} y={Y(enter) + 3} className="lx-axis lx-limit-text" textAnchor="end" dy={-6}>start</text>
          <line x1={30} x2={590} y1={Y(leave)} y2={Y(leave)} stroke="var(--link)" strokeDasharray="6 4" />
          <text x={592} y={Y(leave) + 12} className="lx-axis" textAnchor="end" fill="var(--link)">stop</text>
          {endAt !== null && <line x1={X(endAt / DT)} x2={X(endAt / DT)} y1={16} y2={130} className="lx-cursor" />}
          {endAt !== null && <text x={X(endAt / DT) - 4} y={14} className="lx-axis" textAnchor="end">recording ends</text>}
        </svg>
        <label className="lx-slider"><span>Start above</span><input type="range" min={0.2} max={0.8} step={0.01} value={enter} onChange={(e) => setEnter(Number(e.target.value))} /><output>{enter.toFixed(2)}</output></label>
        <label className="lx-slider"><span>Stop below</span><input type="range" min={0.2} max={0.8} step={0.01} value={leave} onChange={(e) => setLeave(Number(e.target.value))} /><output>{leave.toFixed(2)}</output></label>
        <div className="lx-stats">
          <span>Switches between speech and silence <b className={switches > 6 ? "ex-warn" : ""}>{switches}</b></span>
          <button type="button" className="lx-btn" onClick={() => { setEnter(0.5); setLeave(0.35); }}>Orion's settings</button>
        </div>
      </div>
      <figcaption className="lx-caption">
        The grey line is a voice detector's score, 0 to 1, for someone saying two phrases (an illustration). The recording ends after 1.2 seconds below the stop line.
        Set both lines to the same value and watch the black bar break up.
      </figcaption>
    </figure>
  );
}
