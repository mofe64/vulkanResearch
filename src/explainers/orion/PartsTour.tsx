import { useState } from "react";
import RobotView from "../kit/RobotView";
import { POSES } from "../kit/orion";
import "../kit/kit.css";

// Mesh names come from the model (scripts/step2glb.py and scripts/orion-hardware.json).
const PARTS = [
  { id: "brain", name: "Computer", parts: ["HW-pi", "HW-cooler"], what: "A Raspberry Pi 5 in the base runs everything: hearing, speaking, moving and the camera." },
  { id: "ears", name: "Ears", parts: ["HW-mic"], what: "A board with four microphones. It cleans up your voice and cancels out Orion's own speaker." },
  { id: "eyes", name: "Eyes", parts: ["HW-camera"], what: "A wide-angle camera in the head, used to find faces, hands and objects on the desk." },
  { id: "voice", name: "Voice", parts: ["HW-speaker"], what: "A small speaker in the head, so Orion's voice comes from where it's looking." },
  { id: "light", name: "Light", parts: ["HW-led", "OR21-21"], what: "A ring of 24 LEDs behind a diffuser. It's a lamp first, and the light also signals what Orion is doing." },
  { id: "motors", name: "Motors", parts: ["HW-servo"], what: "Five servos, one per joint: base, shoulder, elbow, head nod and head swivel." },
  { id: "driver", name: "Motor board", parts: ["HW-servoboard"], what: "Passes commands from the Pi to all five servos over one shared cable, and powers them." },
];

/** Tap a part of Orion to see it inside the lamp and what it's for. */
export default function PartsTour() {
  const [i, setI] = useState(0);
  const p = PARTS[i];
  return (
    <figure className="lx">
      <RobotView joints={POSES.home.positions} parts={p.parts} xray label={`Orion's ${p.name.toLowerCase()} highlighted inside the lamp`} />
      <div className="lx-body">
        <div className="lx-row">
          {PARTS.map((x, k) => (
            <button key={x.id} type="button" className="lx-btn" aria-pressed={i === k} onClick={() => setI(k)}>{x.name}</button>
          ))}
        </div>
        <p className="lx-card"><b>{p.name}</b>{p.what}</p>
      </div>
      <figcaption className="lx-caption">The shell turns see-through so you can find parts inside the base and head. Drag to look around.</figcaption>
    </figure>
  );
}
