import { useEffect, useRef, useState } from "react";
import { reducedMotion, useOnScreen } from "../kit/playback";
import "../kit/kit.css";

const ASSOC = 20; // degrees: a detection this close to a track's prediction is the same person (tracker.py)
const MAX_AGE = 1; // seconds a track survives without being seen

interface Track { id: number; az: number; v: number; seen: number }

/** Two people walk past; detections sometimes drop out. Tracks keep each person's number through the gaps. */
export default function TrackKeeper() {
  const [miss, setMiss] = useState(0.3);
  const [box, onScreen] = useOnScreen();
  const [view, setView] = useState<{ t: number; dets: number[]; tracks: Track[] }>({ t: 0, dets: [], tracks: [] });
  const s = useRef({ t: 0, tracks: [] as Track[], next: 1, seed: 3 });

  useEffect(() => {
    if (!onScreen || reducedMotion()) return;
    const dt = 0.1; // 10 detections a second
    const id = setInterval(() => {
      const st = s.current;
      st.t += dt;
      const rand = () => ((st.seed = (st.seed * 16807) % 2147483647) / 2147483647);
      // Where the two people really are (degrees, + = Orion's left), walking past each other.
      const people = [-45 + ((st.t * 9) % 90), 40 - ((st.t * 6) % 80)];
      const dets = people.filter(() => rand() > miss).map((a) => a + (rand() - 0.5) * 3);
      st.tracks = st.tracks.filter((tr) => st.t - tr.seen <= MAX_AGE);
      const used = new Set<number>();
      for (const tr of st.tracks) {
        const predicted = tr.az + tr.v * (st.t - tr.seen);
        let best = -1;
        let bestD = ASSOC;
        dets.forEach((d, j) => { const dist = Math.abs(d - predicted); if (!used.has(j) && dist <= bestD) [best, bestD] = [j, dist]; });
        if (best >= 0) {
          used.add(best);
          tr.v = 0.7 * tr.v + 0.3 * ((dets[best] - tr.az) / Math.max(dt, st.t - tr.seen));
          tr.az = dets[best];
          tr.seen = st.t;
        }
      }
      dets.forEach((d, j) => { if (!used.has(j)) st.tracks.push({ id: st.next++, az: d, v: 0, seen: st.t }); });
      setView({ t: st.t, dets, tracks: st.tracks.map((x) => ({ ...x })) });
    }, 100);
    return () => clearInterval(id);
  }, [miss, onScreen]);

  const X = (a: number) => 300 - a * 3.2;
  return (
    <figure className="lx" ref={box}>
      <div className="lx-body">
        <svg viewBox="0 0 600 130" className="lx-plot" role="img" aria-label="Detections and numbered tracks across Orion's view">
          <line x1={20} x2={580} y1={70} y2={70} stroke="#e5e5e5" />
          {view.dets.map((d, i) => <circle key={i} cx={X(d)} cy={70} r={5} fill="#3b3632" />)}
          {view.tracks.map((tr) => {
            const fresh = view.t - tr.seen < 0.15;
            return (
              <g key={tr.id} opacity={fresh ? 1 : 0.45}>
                <circle cx={X(tr.az + tr.v * (view.t - tr.seen))} cy={70} r={16} fill="none" stroke="var(--heat)" strokeWidth={2} strokeDasharray={fresh ? undefined : "4 3"} />
                <text x={X(tr.az + tr.v * (view.t - tr.seen))} y={40} textAnchor="middle" className="lx-axis lx-axis-lg" style={{ fill: "var(--heat)" }}>#{tr.id}</text>
              </g>
            );
          })}
          <text x={20} y={120} className="lx-axis">Orion's right</text>
          <text x={580} y={120} textAnchor="end" className="lx-axis">Orion's left</text>
        </svg>
        <label className="lx-slider"><span>Missed detections</span><input type="range" min={0} max={0.8} step={0.05} value={miss} onChange={(e) => setMiss(Number(e.target.value))} /><output>{Math.round(miss * 100)}%</output></label>
        <div className="lx-stats"><span>Track numbers handed out so far <b>{s.current.next - 1}</b></span></div>
      </div>
      <figcaption className="lx-caption">Black dots are detections this instant; orange rings are tracks. A dashed ring is predicted, not seen. A track survives 1 second unseen, and a detection within 20° of its prediction keeps its number. Push the missed detections up and watch new numbers appear.</figcaption>
    </figure>
  );
}
