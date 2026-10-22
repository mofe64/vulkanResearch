import { useMemo, useState } from "react";
import { MOTIONS } from "../kit/orion";
import SequenceView from "../kit/SequenceView";
import "../kit/kit.css";

// Orion's idle timing (runtime/src/expression/character.rs and acts.rs).
const MICRO = [8, 20];
const LARGE = [35, 75];
const MICRO_IDLES = ["idle_breathe", "idle_head_curiosity", "idle_micro_glance", "idle_shoulder_adjust"];
const LARGE_IDLES = ["idle_weight_shift", "idle_soft_head_shake"];
const SPAN = 180; // three minutes

function schedule(energy: number, seed: number) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const between = ([a, b]: number[]) => (a + rand() * (b - a)) * (1.6 - energy); // low energy spreads idles out
  const out: { t: number; large: boolean; name: string }[] = [];
  let micro = between(MICRO);
  let large = between(LARGE);
  while (Math.min(micro, large) < SPAN) {
    // Whichever is due first plays; then that kind is scheduled again.
    if (micro <= large) {
      out.push({ t: micro, large: false, name: MICRO_IDLES[Math.floor(rand() * MICRO_IDLES.length)] });
      micro += between(MICRO);
    } else {
      out.push({ t: large, large: true, name: LARGE_IDLES[Math.floor(rand() * LARGE_IDLES.length)] });
      large += between(LARGE);
    }
  }
  return out;
}

/** Three minutes of an idle lamp: a fixed loop next to Orion's irregular schedule. */
export default function IdleRhythm() {
  const [energy, setEnergy] = useState(0.6);
  const [seed, setSeed] = useState(11);
  const events = useMemo(() => schedule(energy, seed), [energy, seed]);
  const X = (t: number) => 20 + (t / SPAN) * 560;
  const loop = Array.from({ length: Math.floor(SPAN / 12) }, (_, i) => 6 + i * 12);
  return (
    <figure className="lx">
      <div className="lx-body">
        <svg className="lx-plot" viewBox="0 0 600 170" role="img" aria-label="Idle movements over three minutes">
          <text x={20} y={18} className="lx-axis lx-axis-lg">A fixed loop: the same move every 12 s</text>
          {loop.map((t) => <rect key={t} x={X(t) - 3} y={28} width={6} height={24} rx={1} fill="#c9c4bd" />)}
          <text x={20} y={84} className="lx-axis lx-axis-lg">Orion: small idles, and bigger ones in orange</text>
          {events.map((e, i) => <rect key={i} x={X(e.t) - 3} y={e.large ? 94 : 106} width={6} height={e.large ? 36 : 24} rx={1} fill={e.large ? "var(--heat)" : "#3b3632"}><title>{e.name}</title></rect>)}
          {[0, 60, 120, 180].map((t) => <text key={t} x={X(t)} y={162} textAnchor="middle" className="lx-axis lx-axis-lg">{t / 60} min</text>)}
        </svg>
        <label className="lx-slider"><span>Energy</span><input type="range" min={0} max={1} step={0.01} value={energy} onChange={(e) => setEnergy(Number(e.target.value))} /><output>{energy.toFixed(2)}</output></label>
        <div className="lx-row">
          <button type="button" className="lx-btn" onClick={() => setSeed(seed + 1)}>Another three minutes</button>
          <span className="lx-note">{events.length} idles. At this energy the gaps are stretched {(1.6 - energy).toFixed(2)}×.</span>
        </div>
      </div>
      <figcaption className="lx-caption">The loop is easy to spot after a minute, and then it looks mechanical. Orion's idles come at varied times and vary in size, which reads as alive.</figcaption>
    </figure>
  );
}

/** Orion's idle motions, played one after another on the 3D lamp. */
export function IdleGallery() {
  return (
    <SequenceView
      steps={[...MICRO_IDLES, ...LARGE_IDLES].map((m) => ({ label: m.replace("idle_", "").replace(/_/g, " "), motion: m, note: MOTIONS[m].description }))}
      caption="Each of Orion's six idle motions in turn. On the real lamp they're seconds apart, at irregular times."
    />
  );
}
