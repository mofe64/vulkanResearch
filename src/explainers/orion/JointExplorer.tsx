import { useState } from "react";
import RobotView from "../kit/RobotView";
import { JOINT_INFO, JOINTS_BASE_UP, LIMITS, POSES, deg, type JointName, type Positions } from "../kit/orion";
import "../kit/kit.css";

/** Five sliders, one per joint, each stopping at the real lamp's limits. The parts a joint moves light up. */
export default function JointExplorer() {
  const [q, setQ] = useState<Positions>({ ...POSES.home.positions });
  const [active, setActive] = useState<JointName | null>(null);
  return (
    <figure className="lx">
      <RobotView joints={q} highlight={active} label="Orion's 3D model, posed by the joint sliders" />
      <div className="lx-body">
        <div className="lx-sliders">
          {JOINTS_BASE_UP.map((j) => (
            <label key={j} className={`lx-slider ${active === j ? "is-active" : ""}`}>
              <span>{JOINT_INFO[j].label}</span>
              <input
                type="range"
                min={LIMITS[j].lower}
                max={LIMITS[j].upper}
                step={0.005}
                value={q[j]}
                onChange={(e) => setQ({ ...q, [j]: Number(e.target.value) })}
                onPointerDown={() => setActive(j)}
                onFocus={() => setActive(j)}
                onBlur={() => setActive(null)}
                onPointerUp={() => setActive(null)}
              />
              <output>{deg(q[j]).toFixed(0)}°</output>
            </label>
          ))}
        </div>
        <div className="lx-row">
          <span className="lx-label">Reset to</span>
          <button type="button" className="lx-btn" onClick={() => setQ({ ...POSES.home.positions })}>home</button>
          <button type="button" className="lx-btn" onClick={() => setQ({ ...POSES.rest.positions })}>rest (all zero)</button>
        </div>
      </div>
      <figcaption className="lx-caption">
        {active ? (
          <>The <b>{JOINT_INFO[active].label.toLowerCase()}</b> {JOINT_INFO[active].does}. Its servo stops at {deg(LIMITS[active].lower).toFixed(0)}° and {deg(LIMITS[active].upper).toFixed(0)}°.</>
        ) : (
          <>Drag a slider to move one joint; the parts it moves turn orange. Drag the lamp to look around it.</>
        )}
      </figcaption>
    </figure>
  );
}
