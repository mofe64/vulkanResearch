import { useEffect, useRef, useState } from "react";
import { reducedMotion, useOnScreen } from "../kit/playback";
import "../kit/kit.css";

const JOB_SECONDS = 1.5; // an illustrative speech recognition job: it takes on the order of a second or two

/**
 * A motor loop ticking 50 times a second beside a slow job. Put the job inside the loop and every tick waits for it:
 * the arm freezes, then jumps.
 */
export default function LoopVsThinking() {
  const [inside, setInside] = useState(false);
  const [paused, setPaused] = useState(() => reducedMotion());
  const [box, onScreen] = useOnScreen();
  const [state, setState] = useState({ t: 0, armT: 0, ticks: [] as number[], job: null as null | number });
  const sim = useRef({ t: 0, armT: 0, nextTick: 0, ticks: [] as number[], jobStart: 0.6, last: 0 });

  useEffect(() => {
    if (!onScreen || paused) return;
    const s = sim.current;
    s.last = performance.now();
    let raf = 0;
    const frame = (now: number) => {
      s.t += Math.min(0.1, (now - s.last) / 1000);
      s.last = now;
      const busy = s.t >= s.jobStart && s.t < s.jobStart + JOB_SECONDS;
      if (s.t >= s.jobStart + JOB_SECONDS + 1.2) s.jobStart = s.t + 0.8; // start the next job after a pause
      // A tick can only happen when the loop isn't stuck inside the slow job.
      while (s.nextTick <= s.t) {
        if (inside && busy) { s.nextTick = s.jobStart + JOB_SECONDS; break; }
        s.ticks.push(s.nextTick);
        s.armT = s.nextTick; // each tick moves the arm on to where it should be now
        s.nextTick += 0.02;
      }
      s.ticks = s.ticks.filter((x) => x > s.t - 2);
      setState({ t: s.t, armT: s.armT, ticks: [...s.ticks], job: busy ? s.jobStart : null });
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [inside, onScreen, paused]);

  const X = (t: number) => 590 - (state.t - t) * 280; // the last two seconds, newest on the right
  const angle = Math.sin(state.armT * 2.2) * 35;
  return (
    <figure className="lx" ref={box}>
      <div className="lx-body">
        <svg className="lx-plot" viewBox="0 0 600 170" role="img" aria-label="Motor loop ticks beside a slow speech job">
          <text x={10} y={26} className="lx-axis">MOTOR LOOP</text>
          {state.ticks.map((t) => <line key={t} x1={X(t)} x2={X(t)} y1={34} y2={58} stroke="#3b3632" strokeWidth={1} />)}
          <text x={10} y={92} className="lx-axis">SPEECH TO TEXT</text>
          {state.job !== null && <rect x={X(state.job)} y={100} width={Math.max(0, X(state.t) - X(state.job))} height={22} rx={3} fill="var(--heat)" fillOpacity={0.2} stroke="var(--heat)" />}
          <g transform="translate(540 150)">
            <line x1={0} y1={0} x2={0} y2={-14} stroke="#3b3632" strokeWidth={3} />
            <line x1={0} y1={-14} x2={Math.sin((angle * Math.PI) / 180) * 30} y2={-14 - Math.cos((angle * Math.PI) / 180) * 30} stroke="#3b3632" strokeWidth={6} strokeLinecap="round" />
          </g>
          <text x={10} y={160} className="lx-axis">the arm, moved by each tick →</text>
        </svg>
        <div className="lx-row">
          <button type="button" className="lx-play" onClick={() => setPaused(!paused)} aria-label={paused ? "Play" : "Pause"}>{paused ? "▶" : "❚❚"}</button>
        <label className="lx-switch">
          <input type="checkbox" checked={inside} onChange={(e) => setInside(e.target.checked)} />
          Run speech recognition inside the motor loop
        </label>
        </div>
      </div>
      <figcaption className="lx-caption">
        {inside
          ? "Now every tick has to wait for the slow job. The ticks stop, the arm freezes, then jumps to catch up."
          : "Each line is one tick of the motor loop. The orange bar is a slow job running separately; the ticks don't notice it."}
      </figcaption>
    </figure>
  );
}
