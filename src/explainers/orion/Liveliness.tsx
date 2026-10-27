import { useState } from "react";
import "../kit/kit.css";

// Studio's "How lively Orion is" (docs/configuration.md, motion-architecture.md).
const MODES = {
  Quiet: {
    note: "Orion reacts with movement only. It never speaks unless spoken to.",
    rows: [["Glances, looks back, notices new things", true], ["Speaks first", false], ["Waves back, light care, break nudge, goodnight", false], ["Farewells and hand play", false]],
  },
  Lively: {
    note: "Orion can also say a short remark, and looks after the people at the desk. Its own rules, and its quirks, keep it from overdoing it.",
    rows: [["Glances, looks back, notices new things", true], ["Speaks first, within its rules", true], ["Waves back, light care, break nudge, goodnight", true], ["Farewells and hand play", false]],
  },
  Demo: {
    note: "For showing Orion to people: up to 20 gestures in 10 minutes, remarks 30 s apart, bigger movements, and one camera picture sent with each remark.",
    rows: [["Glances, looks back, notices new things (more often)", true], ["Speaks first, much more often", true], ["Light care, break nudge, goodnight (faster)", true], ["Farewells and hand play", true]],
  },
} as const;
type Mode = keyof typeof MODES;

/** One setting decides how much Orion does on its own. */
export default function Liveliness() {
  const [mode, setMode] = useState<Mode>("Lively");
  const m = MODES[mode];
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">How lively</span>
          {(Object.keys(MODES) as Mode[]).map((k) => <button key={k} type="button" className="lx-btn" aria-pressed={mode === k} onClick={() => setMode(k)}>{k}</button>)}
        </div>
        <ul className="lx-list">
          {m.rows.map(([what, on]) => (
            <li key={what} className={on ? "" : "is-off"}><span aria-hidden="true">{on ? "✓" : "✕"}</span><span>{what}</span><span className="lx-where">{on ? "on" : "off"}</span></li>
          ))}
        </ul>
        <p className="lx-card">{m.note}</p>
      </div>
      <figcaption className="lx-caption">The setting is in Studio. Turning Lively or Demo on also switches on the camera behaviours they need.</figcaption>
    </figure>
  );
}
