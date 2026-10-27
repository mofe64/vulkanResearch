import { useState } from "react";
import "../kit/kit.css";

// Tracking modes and the camera privacy switch (vision/README.md, docs/system-architecture.md).
const MODES = {
  Off: { runs: "Nothing in the background", follows: "Nothing", note: "You can still view the camera in Studio." },
  Idle: { runs: "Face detection for Orion's own behaviours", follows: "The person talking to it, during a conversation", note: "The default: Orion notices, but doesn't stare." },
  Faces: { runs: "Face detection", follows: "Faces, all the time", note: "Ambient following: Orion keeps looking at whoever is there." },
  Hands: { runs: "Palm detection instead of faces", follows: "Your hand", note: "Move your hand and the head follows it, like a torch you can steer. Saying “follow my hand” switches to this mode, and “stop following” switches back." },
} as const;
type Mode = keyof typeof MODES;

/** Choose a tracking mode, then switch the camera's privacy setting and see what changes. */
export default function VisionModes() {
  const [mode, setMode] = useState<Mode>("Idle");
  const [camera, setCamera] = useState(true);
  const m = MODES[mode];
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Tracking</span>
          {(Object.keys(MODES) as Mode[]).map((k) => <button key={k} type="button" className="lx-btn" aria-pressed={mode === k} onClick={() => setMode(k)}>{k}</button>)}
        </div>
        <label className="lx-switch"><input type="checkbox" checked={camera} onChange={(e) => setCamera(e.target.checked)} />Camera on (privacy off switches it off completely)</label>
        <ul className="lx-list">
          <li className={!camera ? "is-off" : ""}><span>●</span><span>Detects: {m.runs}</span><span className="lx-where">on the Pi</span></li>
          <li className={!camera ? "is-off" : ""}><span>●</span><span>Follows: {m.follows}</span><span className="lx-where">via the runtime</span></li>
          <li className={!camera ? "is-off" : ""}><span>●</span><span>Viewing in Studio, with one cyan light on the ring while it's on</span><span className="lx-where">needs permission</span></li>
        </ul>
        <p className="lx-card">{camera ? m.note : "Capture is closed and the images in memory are cleared. Nothing is detected or followed, in any mode."}</p>
      </div>
      <figcaption className="lx-caption">Whatever the mode, the camera can't wake a resting lamp or switch the motors on, and images are never written to disk.</figcaption>
    </figure>
  );
}
