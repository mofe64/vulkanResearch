import { useEffect, useState } from "react";
import "../kit/kit.css";

const RATIO = 1.5; // a new face must look 1.5 times bigger (closer)... (pipeline.py)
const HOLD = 1; // ...and stay that way for 1 second, before Orion switches to it

interface Face { id: number; name: string; size: number; looking: boolean }

/** Several faces in view: Orion keeps looking at one, and only switches for a clearly better one that stays. */
export default function TargetChooser() {
  const [faces, setFaces] = useState<Face[]>([
    { id: 1, name: "Ada", size: 1, looking: true },
    { id: 2, name: "Ben", size: 0.8, looking: true },
    { id: 3, name: "Cy", size: 1.2, looking: false },
  ]);
  const [target, setTarget] = useState(1);
  const [challenger, setChallenger] = useState<{ id: number; since: number } | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setNow((t) => t + 0.1), 100);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const current = faces.find((f) => f.id === target)!;
    const best = faces
      .filter((f) => f.id !== target && f.looking && f.size >= RATIO * current.size)
      .sort((a, b) => b.size - a.size)[0];
    if (!best) setChallenger(null);
    else if (!challenger || challenger.id !== best.id) setChallenger({ id: best.id, since: now });
    else if (now - challenger.since >= HOLD) {
      setTarget(best.id);
      setChallenger(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now]);

  const set = (id: number, patch: Partial<Face>) => setFaces(faces.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-faces">
          {faces.map((f) => (
            <div key={f.id} className={`lx-facecard ${f.id === target ? "is-on" : ""} ${challenger?.id === f.id ? "is-next" : ""}`}>
              <span style={{ fontSize: 24 + f.size * 22 }}>{f.looking ? "🙂" : "😶"}</span>
              <b>{f.name}</b>
              <label className="lx-slider" style={{ gridTemplateColumns: "1fr" }}>
                <input type="range" min={0.5} max={2.5} step={0.05} value={f.size} onChange={(e) => set(f.id, { size: Number(e.target.value) })} aria-label={`How close ${f.name} is`} />
              </label>
              <label className="lx-switch"><input type="checkbox" checked={f.looking} onChange={(e) => set(f.id, { looking: e.target.checked })} />looking at Orion</label>
              <span className="lx-note">{f.id === target ? "Orion is looking here" : challenger?.id === f.id ? `switching in ${Math.max(0, HOLD - (now - challenger.since)).toFixed(1)} s` : ""}</span>
            </div>
          ))}
        </div>
      </div>
      <figcaption className="lx-caption">Slide a face closer (bigger). Orion only switches to someone who is looking at it, looks at least 1.5 times bigger than its current target, and stays that way for a full second. Otherwise it would flick between people.</figcaption>
    </figure>
  );
}
