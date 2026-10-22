import { useState } from "react";
import FlowMap, { type FlowEdge, type FlowNode } from "../kit/FlowMap";
import RobotView from "../kit/RobotView";
import { POSES, zeros, type Motion, type Positions } from "../kit/orion";
import { stateAt, useOnScreen, usePlayback } from "../kit/playback";
import { useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

type State = "awake" | "going_to_rest" | "resting" | "waking";

const NODES: FlowNode[] = [
  { id: "awake", x: 110, y: 50, label: "awake" },
  { id: "going_to_rest", x: 470, y: 50, label: "going to rest", w: 130 },
  { id: "resting", x: 470, y: 170, label: "resting" },
  { id: "waking", x: 110, y: 170, label: "waking" },
];
const EDGES: FlowEdge[] = [
  { from: "awake", to: "going_to_rest" },
  { from: "going_to_rest", to: "resting" },
  { from: "resting", to: "waking" },
  { from: "waking", to: "awake" },
];

// The events that move Orion between states (docs/system-architecture.md, "Automatic rest and waking").
const EVENTS: { label: string; from: State; to: State; pose: string; note: string }[] = [
  { label: "Nobody talks to it for 30 minutes", from: "awake", to: "going_to_rest", pose: "rest", note: "The deadline runs out. Orion fades its light and folds down." },
  { label: "It reaches the rest pose", from: "going_to_rest", to: "resting", pose: "rest", note: "Only once the motors measure that they've arrived does Orion switch them off." },
  { label: "Someone says “Hey Orion”", from: "resting", to: "waking", pose: "home", note: "A confirmed wake word starts the move back up to home, and it keeps listening while it moves." },
  { label: "It reaches home", from: "waking", to: "awake", pose: "home", note: "Awake again, with a fresh deadline." },
];

const goTo = (pose: string): Motion => ({
  name: "rest_transition",
  description: "",
  space: "absolute",
  style: "return_home",
  keyframes: [{ pose, target: {}, duration: 1.6, arrival: "settle", hold: 0, marker: null }],
});

/** Orion's rest cycle as a small state machine: trigger the events and watch the lamp follow. */
export default function RestStates() {
  const [state, setState] = useState<State>("awake");
  const [move, setMove] = useState<{ from: Positions; pose: string; n: number }>({ from: POSES.home.positions, pose: "home", n: 0 });
  const [note, setNote] = useState("Orion is awake. Pick the event that can happen next.");
  const { traj } = useCompiled({ motion: goTo(move.pose), start: { positions: move.from, velocities: zeros(), anchor: move.from } }, `${move.pose}-${move.n}`);
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { active: onScreen });
  const q = traj ? stateAt(traj, play.t).positions : move.from;

  const fire = (e: (typeof EVENTS)[number]) => {
    setState(e.to);
    setNote(e.note);
    if (e.pose !== move.pose) setMove({ from: { ...q }, pose: e.pose, n: move.n + 1 });
  };

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={q} camera="side" label={`Orion, ${state.replace(/_/g, " ")}`} />
      <div className="lx-body">
        <FlowMap nodes={NODES} edges={EDGES} height={220} active={[state]} label="Orion's rest states" />
        <div className="lx-row">
          {EVENTS.map((e) => (
            <button key={e.label} type="button" className="lx-btn" disabled={e.from !== state} onClick={() => fire(e)}>{e.label}</button>
          ))}
        </div>
        <p className="lx-card">{note}</p>
      </div>
      <figcaption className="lx-caption">Only the events that can happen in the current state are enabled. If a move fails, Orion keeps its light on and reports a fault instead.</figcaption>
    </figure>
  );
}
