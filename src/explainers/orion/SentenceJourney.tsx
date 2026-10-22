import FlowMap, { type FlowEdge, type FlowNode } from "../kit/FlowMap";
import Stepper from "../kit/Stepper";
import { useOnScreen, useSteps } from "../kit/playback";
import "../kit/kit.css";

const NODES: FlowNode[] = [
  { id: "mic", x: 80, y: 70, label: "Microphones", sub: "ears" },
  { id: "listener", x: 230, y: 70, label: "Listener", sub: "\"was that my name?\"" },
  { id: "asr", x: 380, y: 70, label: "Qwen", sub: "speech to text" },
  { id: "agent", x: 520, y: 160, label: "Codex", sub: "writes a reply", w: 104 },
  { id: "tts", x: 380, y: 250, label: "Piper", sub: "text to speech" },
  { id: "runtime", x: 230, y: 250, label: "Runtime", sub: "plays and moves" },
  { id: "out", x: 80, y: 250, label: "Speaker + motors", w: 124 },
];
const EDGES: FlowEdge[] = [
  { from: "mic", to: "listener" },
  { from: "listener", to: "asr" },
  { from: "asr", to: "agent", via: [520, 70] },
  { from: "agent", to: "tts", via: [520, 250] },
  { from: "tts", to: "runtime" },
  { from: "runtime", to: "out" },
];
// What travels along each edge, in the order it happens.
const STEPS = [
  { node: "mic", carry: "sound", text: "You say “Hey Orion, will it rain tomorrow?” The microphones turn the sound into a stream of numbers." },
  { node: "listener", carry: "“Hey Orion…”", text: "The listener is always waiting for its name. It hears “Hey Orion”, double-checks it, then records the rest of your sentence." },
  { node: "asr", carry: "words", text: "Qwen, a speech recognition model running on the Pi, turns the recording into text: “will it rain tomorrow?”" },
  { node: "agent", carry: "reply text", text: "Codex, the language model, reads the text, looks up the forecast online, and writes a short reply." },
  { node: "tts", carry: "audio", text: "Piper, a speech synthesiser on the Pi, turns the reply into Orion's voice, a piece at a time." },
  { node: "runtime", carry: "voice + gestures", text: "The runtime plays the voice and plans movements that fit it: a nod here, a tilt there." },
  { node: "out", carry: "", text: "You hear the answer and see Orion move as it speaks. Then it listens for a few seconds in case you reply." },
];

/** One spoken question followed through every part of Orion. */
export default function SentenceJourney() {
  const [box, onScreen] = useOnScreen();
  const s = useSteps(STEPS.length, 2.6, { active: onScreen });
  const step = STEPS[s.step];
  return (
    <figure className="lx" ref={box}>
      <div className="lx-body">
        <FlowMap
          nodes={NODES}
          edges={EDGES}
          height={300}
          groups={[{ label: "On the Raspberry Pi", x: 12, y: 18, w: 440, h: 272 }, { label: "Online", x: 462, y: 112, w: 120, h: 96, kind: "online" }]}
          active={[step.node]}
          packet={s.step < EDGES.length ? { edge: s.step, at: s.at, label: STEPS[s.step].carry } : undefined}
          onSelect={(id) => { s.pause(); s.go(STEPS.findIndex((x) => x.node === id)); }}
          label="Path of one spoken question through Orion"
        />
        <p className="lx-card">
          {step.text}{" "}
          <a href={s.step >= 5 ? "/projects/orion/learn/how-orion-moves/" : "/projects/orion/learn/how-orion-holds-conversations/"}>
            {s.step >= 5 ? "How does Orion move? →" : "How does Orion hold conversations? →"}
          </a>
        </p>
        <Stepper step={s.step} count={STEPS.length} playing={s.playing} onPlay={s.play} onPause={s.pause} onGo={s.go} />
      </div>
      <figcaption className="lx-caption">Tap any box to jump to it. Everything inside the grey box runs on the lamp itself.</figcaption>
    </figure>
  );
}
