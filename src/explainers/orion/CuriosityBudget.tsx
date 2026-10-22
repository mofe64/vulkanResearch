import { useState } from "react";
import "../kit/kit.css";

// Orion's curiosity budget (runtime/src/expression/curiosity.rs).
const WINDOW = 600; // seconds
const MAX = 3; // glances per window
const SPACING = 60; // seconds between glances
const SAME_TARGET = 120; // seconds before the same thing can be glanced at again, doubling each time (habituation)

const THINGS = ["a mug", "your hand", "a book", "a person walking past"];

interface Glance { t: number; what: string; ok: boolean; why: string }

/** Things appear on the desk; Orion may glance at each, but only within its budget. */
export default function CuriosityBudget() {
  const [t, setT] = useState(0);
  const [log, setLog] = useState<Glance[]>([]);
  const done = log.filter((g) => g.ok);

  const notice = (what: string) => {
    const recent = done.filter((g) => g.t > t - WINDOW);
    const last = done.at(-1);
    const before = done.filter((g) => g.what === what);
    const sameRecent = before.at(-1);
    const cooldown = SAME_TARGET * 2 ** Math.min(Math.max(before.length - 1, 0), 4);
    let why = "Glances at it.";
    let ok = true;
    if (recent.length >= MAX) [ok, why] = [false, `Ignores it: already ${MAX} glances in the last 10 minutes.`];
    else if (last && t - last.t < SPACING) [ok, why] = [false, `Ignores it: the last glance was only ${Math.round(t - last.t)} s ago.`];
    else if (sameRecent && t - sameRecent.t < cooldown) [ok, why] = [false, `Ignores it: it's getting used to ${what}, and won't look again for ${Math.round(cooldown / 60)} min.`];
    setLog([...log, { t, what, ok, why }]);
  };

  const used = done.filter((g) => g.t > t - WINDOW).length;
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Clock {fmt(t)}</span>
          <span className="lx-label">Glances left</span>
          {Array.from({ length: MAX }, (_, k) => <span key={k} className={`lx-token ${k < MAX - used ? "is-on" : ""}`} />)}
        </div>
        <div className="lx-row">
          <span className="lx-label">On the desk</span>
          {THINGS.map((w) => <button key={w} type="button" className="lx-btn" onClick={() => notice(w)}>{w} appears</button>)}
        </div>
        <div className="lx-row">
          <span className="lx-label">Wait</span>
          {[20, 60, 300].map((s) => <button key={s} type="button" className="lx-btn" onClick={() => setT(t + s)}>{s < 60 ? `${s} s` : `${s / 60} min`}</button>)}
          <button type="button" className="lx-btn" style={{ marginLeft: "auto" }} onClick={() => { setT(0); setLog([]); }}>Start over</button>
        </div>
        <ul className="lx-log" aria-live="polite">
          {[...log].reverse().slice(0, 5).map((g, k) => (
            <li key={log.length - k} className={k === 0 ? "is-new" : ""}>{fmt(g.t)} · {g.what}: {g.why}</li>
          ))}
          {log.length === 0 && <li>Put something on the desk.</li>}
        </ul>
      </div>
      <figcaption className="lx-caption">At most 3 glances in 10 minutes, at least a minute apart. The same thing has to wait 2 minutes, then 4, then 8, as Orion gets used to it. A lamp that reacted to everything would feel restless.</figcaption>
    </figure>
  );
}
