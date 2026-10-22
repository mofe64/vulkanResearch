import { useState } from "react";
import "../kit/kit.css";

// Results an explicit "look at the …" request can return (docs/system-architecture.md, "Camera and vision").
const DESK = [
  { name: "mug", x: 160, y: 110 },
  { name: "book", x: 420, y: 90 },
  { name: "book ", x: 470, y: 150 },
  { name: "plant", x: 590, y: 120 },
];
const ASKS = [
  { say: "Look at the mug", result: "aimed", text: "Found one mug: Orion aims its head at it and holds there as a work anchor." },
  { say: "Look at the book", result: "ambiguous", text: "Two books: Orion asks which one you mean instead of guessing." },
  { say: "Look at the plant", result: "clamped", text: "Found it, but it's past how far the joints can turn: Orion points as far as it can and says so." },
  { say: "Look at the scissors", result: "not_found", text: "Nothing matches, even after searching around: Orion says it can't see any." },
];

/** Ask Orion to look at something on the desk and see the four ways it can answer. */
export default function ObjectAim() {
  const [i, setI] = useState(0);
  const a = ASKS[i];
  const hit = DESK.filter((d) => a.say.includes(d.name.trim()));
  return (
    <figure className="lx">
      <div className="lx-body">
        <svg viewBox="0 0 640 220" className="lx-plot" role="img" aria-label="A desk seen from above with objects">
          <rect x={20} y={40} width={540} height={160} rx={6} fill="#f6f4f0" stroke="#e5e5e5" />
          <path d="M 300 200 L 160 40 L 440 40 Z" fill="var(--heat)" fillOpacity={0.05} />
          <line x1={560} x2={560} y1={30} y2={210} stroke="var(--heat)" strokeDasharray="5 4" />
          <text x={556} y={24} textAnchor="end" className="lx-axis">furthest Orion can turn</text>
          {DESK.map((d) => {
            const on = hit.includes(d);
            return (
              <g key={d.name + d.x}>
                <circle cx={d.x} cy={d.y} r={18} fill="#fff" stroke={on ? "var(--heat)" : "#3b3632"} strokeWidth={on ? 2.5 : 1} />
                <text x={d.x} y={d.y + 34} textAnchor="middle" className="lx-axis lx-axis-lg">{d.name.trim()}</text>
              </g>
            );
          })}
          <rect x={286} y={196} width={28} height={18} rx={3} fill="#fff" stroke="#3b3632" />
          {a.result === "aimed" && <line x1={300} y1={200} x2={160} y2={110} stroke="var(--heat)" strokeWidth={2} />}
          {a.result === "clamped" && <line x1={300} y1={200} x2={545} y2={125} stroke="var(--heat)" strokeWidth={2} strokeDasharray="6 4" />}
        </svg>
        <div className="lx-row">
          {ASKS.map((x, k) => <button key={x.say} type="button" className="lx-btn" aria-pressed={i === k} onClick={() => setI(k)}>“{x.say}”</button>)}
        </div>
        <p className="lx-card"><b><code>{a.result}</code></b>{a.text}</p>
      </div>
      <figcaption className="lx-caption">An illustration of the four results the real request can return. One camera can't measure distance, so Orion assumes objects sit on the desk to work out where to point.</figcaption>
    </figure>
  );
}
