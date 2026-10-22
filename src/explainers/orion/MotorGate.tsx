import { useEffect, useRef, useState } from "react";
import FlowMap, { type FlowEdge, type FlowNode } from "../kit/FlowMap";
import "../kit/kit.css";

type Lamp = "awake" | "resting";

// Each requester, and what the runtime does with it in each state (docs/system-architecture.md, motion-architecture.md).
const ASKS = [
  { id: "voice", label: "Voice", sub: "“Hey Orion”", awake: [true, "Accepted: Orion turns toward you to listen."], resting: [true, "Accepted: a confirmed wake starts the move from rest back to home."] },
  { id: "vision", label: "Camera", sub: "a hand to follow", awake: [true, "Accepted: the head follows the hand, within the joint limits."], resting: [false, "Refused: a hand in view can't wake a resting lamp."] },
  { id: "idle", label: "Idle", sub: "a breath", awake: [true, "Accepted: a small idle movement plays."], resting: [false, "Refused: at rest, ordinary movement is switched off."] },
  { id: "studio", label: "Studio", sub: "Go to rest", awake: [true, "Accepted: Orion folds down, then releases its motors."], resting: [false, "Nothing to do: Orion is already resting."] },
  { id: "bad", label: "A motion file", sub: "past a joint limit", awake: [false, "Refused before moving: the target is outside the joint's limits."], resting: [false, "Refused before moving: the target is outside the joint's limits."] },
] as const;

const NODES: FlowNode[] = [
  ...ASKS.map((a, i) => ({ id: a.id, x: 90, y: 34 + i * 56, label: a.label, sub: a.sub, w: 132 })),
  { id: "runtime", x: 340, y: 146, label: "Runtime", sub: "checks every request", w: 140 },
  { id: "motors", x: 530, y: 146, label: "Motors", w: 100 },
];
const EDGES: FlowEdge[] = [...ASKS.map((a) => ({ from: a.id, to: "runtime" })), { from: "runtime", to: "motors" }];

/** Everything that wants to move Orion has to ask the runtime. Try asking while the lamp is awake, then resting. */
export default function MotorGate() {
  const [lamp, setLamp] = useState<Lamp>("awake");
  const [ask, setAsk] = useState<{ i: number; t: number } | null>(null);
  const [message, setMessage] = useState("Tap a box on the left to send its request.");
  const raf = useRef(0);

  const send = (id: string) => {
    const i = ASKS.findIndex((a) => a.id === id);
    if (i < 0) return;
    cancelAnimationFrame(raf.current);
    const start = performance.now();
    const [ok, why] = ASKS[i][lamp];
    const frame = (now: number) => {
      const t = (now - start) / 900;
      setAsk({ i, t });
      if (t >= 1 && t < 1.05) {
        setMessage(why);
        if (ok && id === "voice" && lamp === "resting") setLamp("awake");
        if (ok && id === "studio") setLamp("resting");
      }
      if (t < 2) raf.current = requestAnimationFrame(frame);
      else setAsk(null);
    };
    raf.current = requestAnimationFrame(frame);
  };
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  let packet;
  if (ask) {
    const [ok] = ASKS[ask.i][lamp];
    if (ask.t < 1) packet = { edge: ask.i, at: ask.t };
    else if (ok) packet = { edge: ASKS.length, at: Math.min(1, ask.t - 1) };
    else packet = { edge: ask.i, at: Math.max(0, 2 - ask.t), bad: true, label: "refused" };
  }

  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Orion is</span>
          {(["awake", "resting"] as const).map((s) => (
            <button key={s} type="button" className="lx-btn" aria-pressed={lamp === s} onClick={() => setLamp(s)}>{s}</button>
          ))}
        </div>
        <FlowMap nodes={NODES} edges={EDGES} height={300} active={ask ? [ASKS[ask.i].id] : []} packet={packet} onSelect={send} label="Requests to move Orion going through the runtime" />
        <p className="lx-card">{message}</p>
      </div>
      <figcaption className="lx-caption">The runtime is the only program that talks to the motors. It can say no, and it says why.</figcaption>
    </figure>
  );
}
