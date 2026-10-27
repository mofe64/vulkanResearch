import { useOnScreen, useSteps } from "../kit/playback";
import Stepper from "../kit/Stepper";
import "../kit/kit.css";

// A made-up stretch of sound, in seconds: what Orion hears, and when.
const WORDS = [
  { t: 0.2, d: 1.4, w: "(TV in the background)", noise: true },
  { t: 2.0, d: 0.9, w: "Hey Orion" },
  { t: 3.05, d: 1.8, w: "what's on my calendar today?" },
];
const WAKE_AT = 2.9; // the wake word is recognised just after it ends
const PRE_ROLL = 3; // seconds always kept in memory (docs/voice-architecture.md)
const KEEP_BEFORE = 3; // all of it goes into the recording
const SPAN = 6.5;

const STEPS = [
  "Orion always keeps the last 3 seconds of sound in memory, and throws away anything older.",
  "It recognises “Hey Orion” just after you finish saying it, so the words are already in the past.",
  "That's why it keeps a memory: the whole 3 seconds go into the recording, so nothing is lost.",
  "It keeps recording until you stop talking. The whole clip goes to speech recognition.",
];

/** Why Orion never misses the start of what you say: a rolling memory of the last three seconds. */
export default function PreRoll() {
  const [box, onScreen] = useOnScreen();
  const s = useSteps(STEPS.length, 3.2, { active: onScreen });
  const now = s.step === 0 ? 1.4 + s.at * 1.4 : s.step === 1 ? WAKE_AT : s.step === 2 ? WAKE_AT : WAKE_AT + s.at * 2.1;
  const X = (t: number) => 20 + (t / SPAN) * 560;
  const kept = s.step >= 2 ? [WAKE_AT - KEEP_BEFORE, now] : null;
  return (
    <figure className="lx" ref={box}>
      <div className="lx-body">
        <svg className="lx-plot" viewBox="0 0 600 150" role="img" aria-label="A rolling three second memory of sound around the wake word">
          <rect x={X(Math.max(0, now - PRE_ROLL))} y={24} width={X(now) - X(Math.max(0, now - PRE_ROLL))} height={70} fill="#f2f2f2" />
          <text x={X(Math.max(0, now - PRE_ROLL)) + 4} y={20} className="lx-axis">last 3 s in memory</text>
          {kept && <rect x={X(kept[0])} y={30} width={X(kept[1]) - X(kept[0])} height={58} fill="var(--heat)" fillOpacity={0.14} stroke="var(--heat)" />}
          {WORDS.map((w) => (
            <g key={w.w} opacity={w.t > now ? 0.15 : 1}>
              <rect x={X(w.t)} y={52} width={X(w.t + w.d) - X(w.t)} height={14} rx={3} fill={w.noise ? "#d8d4ce" : "#3b3632"} />
              <text x={X(w.t)} y={84} className="lx-axis">{w.w}</text>
            </g>
          ))}
          <line x1={X(now)} x2={X(now)} y1={14} y2={110} className="lx-cursor" />
          <text x={X(now) + 4} y={110} className="lx-axis">now</text>
          {s.step >= 1 && <text x={X(WAKE_AT)} y={128} textAnchor="middle" className="lx-axis lx-limit-text">“Hey Orion” recognised</text>}
          {[0, 1, 2, 3, 4, 5, 6].map((t) => <text key={t} x={X(t)} y={146} textAnchor="middle" className="lx-axis">{t}s</text>)}
        </svg>
        <p className="lx-card">{STEPS[s.step]}</p>
        <Stepper step={s.step} count={STEPS.length} playing={s.playing} onPlay={s.play} onPause={s.pause} onGo={s.go} />
      </div>
      <figcaption className="lx-caption">The orange box is what gets recorded. A recording can run up to 15 seconds after the wake word.</figcaption>
    </figure>
  );
}
