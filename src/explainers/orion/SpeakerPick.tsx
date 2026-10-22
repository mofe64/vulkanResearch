import { useState } from "react";
import "../kit/kit.css";

const MIN = 0.05; // mouth movement must clear this... (vision/orion_vision/tracker.py)
const MARGIN = 0.05; // ...and beat the next face by this much

/**
 * When you say “Hey Orion” with others in the room, Orion picks who's talking from how much each face's mouth moved
 * while the wake word was spoken. Set how much each mouth moves.
 */
export default function SpeakerPick() {
  const [motion, setMotion] = useState([0.18, 0.04]);
  const names = ["Ada", "Ben"];
  const ranked = motion.map((m, i) => ({ m, i })).sort((a, b) => b.m - a.m);
  const [top, next] = ranked;
  const chosen = top.m >= MIN && top.m >= next.m + MARGIN ? top.i : null;
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-faces" style={{ gridTemplateColumns: "1fr 1fr" }}>
          {names.map((n, i) => (
            <div key={n} className={`lx-facecard ${chosen === i ? "is-on" : ""}`} style={{ minHeight: 150 }}>
              <span style={{ fontSize: 44 }}>{motion[i] > 0.1 ? "😮" : "🙂"}</span>
              <b>{n}</b>
              <label className="lx-slider" style={{ gridTemplateColumns: "1fr auto" }}>
                <input type="range" min={0} max={0.3} step={0.01} value={motion[i]} onChange={(e) => setMotion(motion.map((m, k) => (k === i ? Number(e.target.value) : m)))} aria-label={`${n}'s mouth movement`} />
                <output>{motion[i].toFixed(2)}</output>
              </label>
              <span className="lx-note">{chosen === i ? "Orion turns to " + n : ""}</span>
            </div>
          ))}
        </div>
        <p className="lx-card">
          {chosen === null
            ? "Too close to call, or nobody's mouth moved enough. Orion doesn't guess: it won't turn to a bystander."
            : `${names[chosen]}'s mouth moved clearly more, so Orion takes ${names[chosen]} as the speaker and keeps following them for the conversation.`}
        </p>
      </div>
      <figcaption className="lx-caption">The score is how much the mouth points (from the face detector's landmarks) moved, minus that face's normal jitter. Orion needs at least 0.05, and a lead of 0.05 over the next face.</figcaption>
    </figure>
  );
}
