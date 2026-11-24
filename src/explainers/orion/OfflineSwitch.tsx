import { useState } from "react";
import "../kit/kit.css";

// From Orion's system architecture: speech recognition and synthesis run locally; Codex replies and search are online.
// Home Assistant runs in a container on the Pi; camera frames stay in memory unless a reply needs one.
const FEATURES = [
  { what: "Hearing “Hey Orion”", online: false },
  { what: "Turning your speech into text", online: false },
  { what: "Speaking in its own voice", online: false },
  { what: "Moving, idling and reacting", online: false },
  { what: "The light", online: false },
  { what: "Timers and alarms", online: false },
  { what: "Smart-home devices (Home Assistant on the Pi)", online: false },
  { what: "Seeing faces and hands", online: false },
  { what: "Studio on your home network", online: false },
  { what: "Writing replies (Codex)", online: true },
  { what: "Searching the web", online: true },
  { what: "A camera snapshot, only when you ask Orion to look (or with remarks in Demo mode)", online: true },
];

/** Switch the internet off and see which of Orion's abilities stop. */
export default function OfflineSwitch() {
  const [online, setOnline] = useState(true);
  return (
    <figure className="lx">
      <div className="lx-body">
        <label className="lx-switch">
          <input type="checkbox" checked={online} onChange={(e) => setOnline(e.target.checked)} />
          Internet connection {online ? "on" : "off"}
        </label>
        <ul className="lx-list">
          {FEATURES.map((f) => (
            <li key={f.what} className={!online && f.online ? "is-off" : ""}>
              <span aria-hidden="true">{!online && f.online ? "✕" : "✓"}</span>
              <span>{f.what}</span>
              <span className="lx-where">{f.online ? "online service" : "on the lamp"}</span>
            </li>
          ))}
        </ul>
      </div>
      <figcaption className="lx-caption">Only the language model, web search and the occasional snapshot that goes with a reply leave the lamp. Without them Orion still hears, moves, lights up and rings the timers and alarms already set. New spoken requests, including ones for your devices, need the language model to understand them.</figcaption>
    </figure>
  );
}
