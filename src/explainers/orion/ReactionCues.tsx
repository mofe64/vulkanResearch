import { useState } from "react";
import RobotView from "../kit/RobotView";
import Scrubber from "../kit/Scrubber";
import { MOTIONS, POSES, zeros } from "../kit/orion";
import { stateAt, useOnScreen, usePlayback } from "../kit/playback";
import { useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

// Orion's reaction cues and the line each might accompany (illustrations). Mood changes are from mind.rs.
const CUES: { cue: string; line: string; mood?: string }[] = [
  { cue: "agree", line: "Yes, that's right.", mood: "+0.05" },
  { cue: "happy", line: "Oh, that's lovely news!", mood: "+0.15" },
  { cue: "laugh", line: "Ha, good one.", mood: "+0.15" },
  { cue: "curious", line: "Hm, what makes you ask?", mood: "+0.05" },
  { cue: "surprised", line: "Really? Already?" },
  { cue: "thinking", line: "Let me think about that." },
  { cue: "sympathy", line: "That sounds like a long day.", mood: "−0.05" },
  { cue: "sorry", line: "Sorry, I didn't catch that." },
  { cue: "unsure", line: "I'm not completely sure.", mood: "−0.05" },
  { cue: "disagree", line: "I don't think so.", mood: "−0.05" },
  { cue: "shy", line: "Oh, thank you." },
];

/**
 * Codex can tag a reply with a reaction. Each is a short motion with one marked peak (the apex), which Orion lines
 * up with the right moment in its speech.
 */
export default function ReactionCues() {
  const [i, setI] = useState(1);
  const c = CUES[i];
  const home = POSES.home.positions;
  const name = `speak_react_${c.cue}`;
  const { traj } = useCompiled({ motion: name, start: { positions: home, velocities: zeros(), anchor: home } }, name);
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { loop: true, active: onScreen });
  const apex = traj?.markers[0];
  return (
    <figure className="lx" ref={box}>
      <RobotView joints={traj ? stateAt(traj, play.t).positions : home} camera="front" label={`Orion's ${c.cue} reaction`} />
      <div className="lx-body">
        <div className="lx-row">
          {CUES.map((x, k) => <button key={x.cue} type="button" className="lx-btn" aria-pressed={i === k} onClick={() => setI(k)}>{x.cue}</button>)}
        </div>
        {traj && <Scrubber t={play.t} duration={traj.duration_seconds} playing={play.playing} onPlay={play.play} onPause={play.pause} onSeek={play.seek} marks={apex ? [{ t: apex.time_seconds, label: "apex" }] : []} />}
        <p className="lx-card"><q>{c.line}</q> {MOTIONS[name].description}</p>
        <div className="lx-stats">
          <span>Apex at <b>{apex ? apex.time_seconds.toFixed(2) : "–"} s</b></span>
          <span>Length <b>{traj ? traj.duration_seconds.toFixed(2) : "–"} s</b></span>
          {c.mood && <span>Mood <b>{c.mood}</b></span>}
        </div>
      </div>
      <figcaption className="lx-caption">The tick on the timeline is the apex, the moment the gesture should land on the word. Every reaction starts and ends at the same pose, so it can drop into speech anywhere.</figcaption>
    </figure>
  );
}
