import FlowMap, { type FlowEdge, type FlowNode } from "../kit/FlowMap";
import Stepper from "../kit/Stepper";
import { useOnScreen, useSteps } from "../kit/playback";
import "../kit/kit.css";

const NODES: FlowNode[] = [
  { id: "inputs", x: 80, y: 60, label: "Camera, clock, voice", sub: "and the light", w: 130 },
  { id: "situation", x: 260, y: 60, label: "Situation", sub: "one picture of now" },
  { id: "reaction", x: 440, y: 60, label: "A reaction?", sub: "arrival, look, object…", w: 130 },
  { id: "budget", x: 440, y: 170, label: "Curiosity budget", sub: "allowed right now?", w: 130 },
  { id: "move", x: 260, y: 170, label: "Movement", sub: "idle stops, it plays" },
  { id: "remark", x: 80, y: 170, label: "A remark?", sub: "only if Lively", w: 130 },
];
const EDGES: FlowEdge[] = [
  { from: "inputs", to: "situation" },
  { from: "situation", to: "reaction" },
  { from: "reaction", to: "budget" },
  { from: "budget", to: "move" },
  { from: "move", to: "remark" },
];
// docs/motion-architecture.md, "Situation and initiative".
const STEPS = [
  { node: "inputs", text: "Every time the camera reports, Orion gathers what it knows: faces in view and whether one looks at it, the time, whether it's talking or playing music, its own light, and how bright the room is." },
  { node: "situation", text: "That becomes one situation: a single picture of right now. Every behaviour reads the same picture, so they never disagree about what's going on." },
  { node: "reaction", text: "Some situations call for a reaction: someone arrives, someone holds Orion's gaze, a new object appears, a hand is raised." },
  { node: "budget", text: "Before acting, the reaction asks the curiosity budget. If Orion has reacted a lot recently, the answer is no, and nothing happens." },
  { node: "move", text: "If it's allowed, idle movement stops, the reaction plays, and Orion writes down what it did and why in its behaviour log." },
  { node: "remark", text: "Only then can it offer to say something, and only on a Lively lamp. The remark has its own, stricter rules." },
];

/** The single path every one of Orion's own initiatives goes through. */
export default function InitiativeFlow() {
  const [box, onScreen] = useOnScreen();
  const s = useSteps(STEPS.length, 3, { active: onScreen });
  return (
    <figure className="lx" ref={box}>
      <div className="lx-body">
        <FlowMap nodes={NODES} edges={EDGES} height={220} active={[STEPS[s.step].node]} packet={s.step < EDGES.length ? { edge: s.step, at: s.at } : undefined}
          onSelect={(id) => { s.pause(); s.go(STEPS.findIndex((x) => x.node === id)); }} label="How Orion decides to act on its own" />
        <p className="lx-card">{STEPS[s.step].text}</p>
        <Stepper step={s.step} count={STEPS.length} playing={s.playing} onPlay={s.play} onPause={s.pause} onGo={s.go} />
      </div>
      <figcaption className="lx-caption">Movement always comes first and words second. A reaction the budget refuses never reaches the remark stage.</figcaption>
    </figure>
  );
}
