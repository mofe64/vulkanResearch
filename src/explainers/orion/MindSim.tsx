import { useState } from "react";
import "../kit/kit.css";

// A line-for-line port of Orion's mind state (runtime/src/expression/mind.rs) and how it shapes idles (acts.rs).
const CIRCADIAN: [number, number][] = [[0, 0.15], [6, 0.15], [10, 0.9], [15, 0.7], [18, 0.8], [22, 0.3], [23, 0.15], [24, 0.15]];
function circadian(hour: number) {
  const h = ((hour % 24) + 24) % 24;
  for (let i = 0; i < CIRCADIAN.length - 1; i++) {
    const [s, a] = CIRCADIAN[i];
    const [e, b] = CIRCADIAN[i + 1];
    if (h <= e) return a + ((b - a) * (h - s)) / (e - s);
  }
  return 0.15;
}
function label(energy: number, mood: number, activity: number) {
  if (energy < 0.3) return "sleepy";
  if (mood > 0.3) return "cheerful";
  if (mood < -0.3) return "subdued";
  if (activity >= 0.5 && Math.abs(mood) <= 0.3) return "curious";
  return "content";
}
const CUES: [string, number][] = [["happy", 0.15], ["laugh", 0.15], ["agree", 0.05], ["sympathy", -0.05], ["unsure", -0.05]];

/** Orion's inner state: energy from the time of day and recent conversation, and a mood that drifts back to neutral. */
export default function MindSim() {
  const [hour, setHour] = useState(11);
  const [activity, setActivity] = useState(0.2);
  const [mood, setMood] = useState(0);
  const energy = Math.min(1, Math.max(0, 0.6 * circadian(hour) + 0.4 * activity));
  const name = label(energy, mood, activity);
  // Time passing: activity halves every 30 minutes, mood every 20 (mind.rs).
  const wait = (minutes: number) => {
    setActivity((a) => a * 2 ** (-minutes / 30));
    setMood((m) => m * 2 ** (-minutes / 20));
    setHour((h) => (h + minutes / 60) % 24);
  };
  const warmth = 0.6 + 0.4 * energy; // light intensity, acts.rs
  const pace = 1.6 - energy;
  const bar = (v: number, lo = 0) => <span className="lx-meter"><i style={{ left: lo < 0 ? "50%" : 0, width: `${(Math.abs(v) / (lo < 0 ? 2 : 1)) * 100}%`, transform: lo < 0 && v < 0 ? "translateX(-100%)" : undefined }} /></span>;
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-mind">
          <div className="lx-glowdot" style={{ opacity: warmth, background: `rgb(255, ${Math.round(170 + 60 * energy)}, ${Math.round(90 + 120 * energy)})` }} aria-hidden="true" />
          <div>
            <p className="lx-big">{name}</p>
            <p className="lx-note">what Orion reports about itself right now</p>
          </div>
        </div>
        <div className="lx-sliders">
          <label className="lx-slider"><span>Time of day</span><input type="range" min={0} max={23.9} step={0.1} value={hour} onChange={(e) => setHour(Number(e.target.value))} /><output>{String(Math.floor(hour)).padStart(2, "0")}:{String(Math.round((hour % 1) * 60) % 60).padStart(2, "0")}</output></label>
          <div className="lx-slider"><span>Energy</span>{bar(energy)}<output>{energy.toFixed(2)}</output></div>
          <div className="lx-slider"><span>Activity</span>{bar(activity)}<output>{activity.toFixed(2)}</output></div>
          <div className="lx-slider"><span>Mood</span>{bar(mood, -1)}<output>{mood.toFixed(2)}</output></div>
        </div>
        <div className="lx-row">
          <button type="button" className="lx-btn is-primary" onClick={() => setActivity((a) => Math.min(1, a + 0.15))}>Have a conversation turn</button>
          {CUES.map(([c, d]) => <button key={c} type="button" className="lx-btn" onClick={() => setMood((m) => Math.max(-1, Math.min(1, m + d)))}>says it with “{c}”</button>)}
        </div>
        <div className="lx-row">
          <span className="lx-label">Let time pass</span>
          {[10, 30, 120].map((m) => <button key={m} type="button" className="lx-btn" onClick={() => wait(m)}>{m < 60 ? `${m} min` : `${m / 60} h`}</button>)}
        </div>
        <div className="lx-stats">
          <span>Gaps between idles <b>×{pace.toFixed(2)}</b></span>
          <span>Background light <b>{Math.round(warmth * 100)}%</b>, {energy < 0.5 ? "warmer" : "brighter"}</span>
        </div>
      </div>
      <figcaption className="lx-caption">These are Orion's real formulas. Try a quiet evening, then a lively chat with lots of laughs, then leave it alone for two hours.</figcaption>
    </figure>
  );
}
