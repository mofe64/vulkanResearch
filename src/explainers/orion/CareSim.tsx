import { useState } from "react";
import "../kit/kit.css";

// Lively care behaviours with the default owner rules (runtime/src/expression/lively.rs, settings.rs).
const BREAK_AFTER = 90; // minutes at the desk
const DARK_LUX = 15;
const LOW_LIGHT = 25; // percent
const GOODNIGHT_FROM = 21;

/** Three ways a Lively Orion looks after whoever is at the desk. Set the scene and see which one it would do. */
export default function CareSim() {
  const [minutes, setMinutes] = useState(45);
  const [lux, setLux] = useState(120);
  const [light, setLight] = useState(0);
  const [hour, setHour] = useState(19);
  const breakDue = minutes >= BREAK_AFTER;
  const dark = lux < DARK_LUX && light < LOW_LIGHT;
  const night = hour >= GOODNIGHT_FROM || hour < 5;
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-sliders">
          <label className="lx-slider"><span>At the desk</span><input type="range" min={0} max={150} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /><output>{minutes} min</output></label>
          <label className="lx-slider"><span>Room light</span><input type="range" min={0} max={300} step={1} value={lux} onChange={(e) => setLux(Number(e.target.value))} /><output>{lux} lux</output></label>
          <label className="lx-slider"><span>Orion's light</span><input type="range" min={0} max={100} step={5} value={light} onChange={(e) => setLight(Number(e.target.value))} /><output>{light}%</output></label>
          <label className="lx-slider"><span>Time</span><input type="range" min={0} max={23} step={1} value={hour} onChange={(e) => setHour(Number(e.target.value))} /><output>{String(hour).padStart(2, "0")}:00</output></label>
        </div>
        <ol className="lx-checks">
          <li className={breakDue ? "is-pass" : "is-skip"}><b>Break nudge</b> after {BREAK_AFTER} minutes at the desk (gaps under 5 minutes don't reset it).<span>{breakDue ? "Orion stretches and suggests a short break." : `${BREAK_AFTER - minutes} more minutes.`}</span></li>
          <li className={dark ? "is-pass" : "is-skip"}><b>Light care</b> when the room is under {DARK_LUX} lux for a minute and Orion's own light is off or under {LOW_LIGHT}%.<span>{dark ? "Orion turns to you and offers to put its light on, in the colour you usually pick in the evening." : lux < DARK_LUX ? "Dark, but Orion's light is already on." : "Bright enough."}</span></li>
          <li className={night ? "is-pass" : "is-skip"}><b>Goodnight</b> when someone leaves between {GOODNIGHT_FROM}:00 and 05:00.<span>{night ? "Orion says goodnight instead of goodbye. If nobody comes back within 2 minutes, it goes to rest." : "A daytime goodbye stays a goodbye."}</span></li>
        </ol>
      </div>
      <figcaption className="lx-caption">Each happens only while someone is in view, and light care and the break nudge at most once a visit. Owners can change the times in Settings, or switch any of them off.</figcaption>
    </figure>
  );
}
