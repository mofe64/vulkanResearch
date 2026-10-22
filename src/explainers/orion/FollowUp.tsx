import { useRef } from "react";
import FlowMap, { type FlowEdge, type FlowNode } from "../kit/FlowMap";
import Stepper from "../kit/Stepper";
import { useOnScreen, useSteps } from "../kit/playback";
import "../kit/kit.css";

const NODES: FlowNode[] = [
  { id: "waiting", x: 90, y: 50, label: "Waiting", sub: "for “Hey Orion”" },
  { id: "listening", x: 300, y: 50, label: "Listening", sub: "recording you" },
  { id: "thinking", x: 510, y: 50, label: "Thinking", sub: "text, reply, voice" },
  { id: "speaking", x: 510, y: 170, label: "Speaking" },
  { id: "quiet", x: 300, y: 170, label: "Settling", sub: "waits for quiet" },
  { id: "followup", x: 90, y: 170, label: "Your turn", sub: "5 s, no wake word" },
];
const EDGES: FlowEdge[] = [
  { from: "waiting", to: "listening" },
  { from: "listening", to: "thinking" },
  { from: "thinking", to: "speaking" },
  { from: "speaking", to: "quiet" },
  { from: "quiet", to: "followup" },
  { from: "followup", to: "listening", via: [180, 110] },
  { from: "followup", to: "waiting" },
];
const STEPS = [
  { node: "waiting", sound: null, text: "Orion listens only for its name. Nothing else you say is recorded or sent anywhere." },
  { node: "listening", sound: "/learn/orion/voice_wake.wav", text: "Wake word confirmed: a short sound and a light pulse tell you it's listening. It records until you stop talking." },
  { node: "thinking", sound: "/learn/orion/voice_processing.wav", text: "Your words become text, Codex writes a reply, Piper turns it into a voice. Orion makes small thinking movements meanwhile." },
  { node: "speaking", sound: null, text: "Orion speaks and moves with its voice. On V2 you can interrupt by saying “Hey Orion” again." },
  { node: "quiet", sound: null, text: "When it finishes, it ignores the first moment of sound (the echo of its own voice) and waits for the room to go quiet." },
  { node: "followup", sound: null, text: "Then a teal pulse: for 5 seconds you can just answer, without saying “Hey Orion”. If you don't, it goes back to waiting." },
];

/** One full turn of conversation, with Orion's own cue sounds. */
export default function FollowUp() {
  const [box, onScreen] = useOnScreen();
  const s = useSteps(STEPS.length, 3, { active: onScreen });
  const step = STEPS[s.step];
  const audio = useRef<HTMLAudioElement | null>(null);
  const hear = () => {
    if (!step.sound) return;
    audio.current?.pause();
    audio.current = new Audio(step.sound);
    audio.current.play().catch(() => {});
  };
  return (
    <figure className="lx" ref={box}>
      <div className="lx-body">
        <FlowMap nodes={NODES} edges={EDGES} height={220} active={[step.node]} onSelect={(id) => { s.pause(); s.go(STEPS.findIndex((x) => x.node === id)); }} label="The stages of one conversation turn" />
        <div className="lx-row">
          {step.node === "followup" && <span className="lx-swatch" style={{ background: "#14b39a" }} aria-label="Teal light" />}
          <p className="lx-card" style={{ flex: 1 }}>{step.text}</p>
        </div>
        <div className="lx-row">
          <Stepper step={s.step} count={STEPS.length} playing={s.playing} onPlay={s.play} onPause={s.pause} onGo={s.go} />
          {step.sound && <button type="button" className="lx-btn" onClick={hear}>▶ Hear the cue</button>}
        </div>
      </div>
      <figcaption className="lx-caption">Tap a stage to jump to it. The cue sounds are the ones Orion plays.</figcaption>
    </figure>
  );
}
