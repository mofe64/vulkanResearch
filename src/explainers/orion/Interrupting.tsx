import { useMemo, useState } from "react";
import "../kit/kit.css";

const N = 240; // points across eight seconds of a reply
const SPAN = 8;

/** A made-up speech-like wave: bursts of syllables with gaps. */
function voice(seed: number, from: number, to: number, size: number) {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  return Array.from({ length: N }, (_, i) => {
    const t = (i / N) * SPAN;
    if (t < from || t > to) return 0;
    const syllable = Math.max(0, Math.sin(t * 9 + seed)) ** 2;
    return size * syllable * (0.6 + 0.4 * rand());
  });
}

const SAYERS = {
  you: { label: "You say “Hey Orion”", words: "Hey Orion", real: true },
  tv: { label: "The TV says “Hey, Ryan”", words: "Hey, Ryan", real: false },
};

/**
 * While Orion talks, its microphones hear its own voice too. Echo cancellation takes it out, so a “Hey Orion” spoken
 * over the reply can still be heard. Both wake checks must still pass before the reply stops.
 */
export default function Interrupting() {
  const [echo, setEcho] = useState(true);
  const [who, setWho] = useState<keyof typeof SAYERS>("you");
  const orion = useMemo(() => voice(5, 0.2, 7.8, 1), []);
  const other = useMemo(() => voice(11, 3.4, 4.3, 0.55), []);
  const heard = orion.map((o, i) => (echo ? o * 0.06 : o) + other[i]);
  const say = SAYERS[who];
  const detected = echo; // without cancellation the quieter voice is buried under Orion's own
  const accepted = detected && say.real;
  const stopAt = 4.5;
  const X = (i: number) => 20 + (i / N) * 560;
  const T = (t: number) => 20 + (t / SPAN) * 560;
  const lane = (values: number[], y: number, cls: string, cut?: number) => (
    <polyline className={`lx-line ${cls}`} points={values.map((v, i) => `${X(i)},${y - (cut !== undefined && (i / N) * SPAN > cut ? 0 : v) * 22}`).join(" ")} />
  );
  return (
    <figure className="lx">
      <div className="lx-body">
        <svg viewBox="0 0 600 220" className="lx-plot" role="img" aria-label="Orion's voice, the other voice, and what the microphones hear">
          <text x={20} y={16} className="lx-axis">ORION SPEAKING</text>
          {lane(orion, 50, "lx-soft", accepted ? stopAt : undefined)}
          <text x={20} y={82} className="lx-axis">{say.words.toUpperCase()}</text>
          {lane(other, 116, "lx-heat")}
          <text x={20} y={148} className="lx-axis">WHAT THE MICROPHONES PASS ON {echo ? "(Orion's voice removed)" : ""}</text>
          {lane(heard.map((v, i) => (accepted && (i / N) * SPAN > stopAt ? other[i] : v)), 190, "lx-ink")}
          {accepted && <line x1={T(stopAt)} x2={T(stopAt)} y1={20} y2={200} className="lx-cursor" />}
          {accepted && <text x={T(stopAt) + 4} y={30} className="lx-axis lx-limit-text">reply stops, new turn starts</text>}
        </svg>
        <div className="lx-row">
          {(Object.keys(SAYERS) as (keyof typeof SAYERS)[]).map((k) => (
            <button key={k} type="button" className="lx-btn" aria-pressed={who === k} onClick={() => setWho(k)}>{SAYERS[k].label}</button>
          ))}
          <label className="lx-switch" style={{ marginLeft: "auto" }}><input type="checkbox" checked={echo} onChange={(e) => setEcho(e.target.checked)} />Echo cancellation</label>
        </div>
        <ol className="lx-checks">
          <li className={detected ? "is-pass" : "is-fail"}><b>Heard over the reply?</b><span>{detected ? "Yes: with Orion's own voice removed, the other voice stands out." : "No: Orion's own voice drowns it out."}</span></li>
          <li className={!detected ? "is-skip" : say.real ? "is-pass" : "is-fail"}><b>Wake word confirmed?</b><span>{!detected ? "Never reached" : say.real ? "Yes: the reply stops and a fresh conversation starts, including the words just before." : "No: the reply carries on as if nothing happened."}</span></li>
        </ol>
      </div>
      <figcaption className="lx-caption">The waves are illustrations. On Orion V2 the microphone board does the echo cancellation itself; Orion V1 has none, so it simply doesn't listen for its name while it talks.</figcaption>
    </figure>
  );
}
