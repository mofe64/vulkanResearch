import { useEffect, useRef, useState, type PointerEvent } from "react";
import "../kit/kit.css";

const C = 130; // dial centre
const R = 92;
const COUNTS = 4096;

/**
 * A servo seen from its output side. Drag the orange target; the horn follows at the servo's own pace, and the
 * position sensor reports where it really is, as a count out of 4096 and as an angle.
 */
export default function ServoDial() {
  const [goal, setGoal] = useState(0.6);
  const [actual, setActual] = useState(0.6);
  const svg = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const actualRef = useRef(actual);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // The horn closes on the goal with a speed limit, like the real motor (5.4 rad/s at full speed).
      const diff = goal - actualRef.current;
      const move = Math.sign(diff) * Math.min(Math.abs(diff), Math.max(0.6, Math.abs(diff) * 6) * dt);
      if (Math.abs(diff) > 1e-4) {
        actualRef.current += move;
        setActual(actualRef.current);
        raf = requestAnimationFrame(step);
      }
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [goal]);

  const pointer = (e: PointerEvent<SVGSVGElement>) => {
    if (!dragging.current || !svg.current) return;
    const r = svg.current.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 260 - C;
    const y = ((e.clientY - r.top) / r.height) * 260 - C;
    setGoal(Math.atan2(x, -y)); // 0 is straight up, clockwise positive
  };

  const raw = Math.round(2047 + (actual / (2 * Math.PI)) * COUNTS);
  // Rounded so the page as built and the page in the browser draw identical numbers.
  const at = (a: number, r: number) => [+(C + r * Math.sin(a)).toFixed(2), +(C - r * Math.cos(a)).toFixed(2)];
  const [hx, hy] = at(actual, R - 14);
  const [gx, gy] = at(goal, R + 10);
  const ticks = Array.from({ length: 32 }, (_, i) => (i / 32) * 2 * Math.PI);

  return (
    <figure className="lx">
      <div className="lx-body">
        <svg
          ref={svg}
          viewBox="0 0 260 260"
          className="lx-plot"
          style={{ maxWidth: 300, margin: "0 auto", touchAction: "none", cursor: "grab" }}
          role="img"
          aria-label={`Servo dial. Goal ${((goal * 180) / Math.PI).toFixed(0)} degrees, horn at ${((actual * 180) / Math.PI).toFixed(0)} degrees.`}
          onPointerDown={(e) => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pointer(e); }}
          onPointerMove={pointer}
          onPointerUp={() => (dragging.current = false)}
        >
          <circle cx={C} cy={C} r={R} fill="#fafaf8" stroke="#3b3632" strokeWidth={1.4} />
          {ticks.map((a, i) => {
            const [x1, y1] = at(a, R - (i % 8 === 0 ? 12 : 6));
            const [x2, y2] = at(a, R);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#3b3632" strokeWidth={i % 8 === 0 ? 1.4 : 0.7} />;
          })}
          <line x1={C} y1={C} x2={hx} y2={hy} stroke="#3b3632" strokeWidth={14} strokeLinecap="round" />
          <circle cx={C} cy={C} r={16} fill="#fff" stroke="#3b3632" strokeWidth={1.4} />
          <circle cx={gx} cy={gy} r={9} fill="var(--heat)" fillOpacity={0.18} stroke="var(--heat)" strokeWidth={1.6} />
        </svg>
        <div className="lx-stats" style={{ justifyContent: "center" }}>
          <span>Goal <b>{((goal * 180) / Math.PI).toFixed(0)}°</b></span>
          <span>Horn <b>{((actual * 180) / Math.PI).toFixed(0)}°</b></span>
          <span>Sensor reads <b>{((raw % COUNTS) + COUNTS) % COUNTS}</b> of 4096</span>
        </div>
      </div>
      <figcaption className="lx-caption">
        Drag the orange dot to set a goal. The horn (the black arm) turns to it at the motor's own pace, and the sensor
        reports where it actually is. The count 2047 means zero degrees.
      </figcaption>
    </figure>
  );
}
