import { useCallback, useEffect, useRef, useState } from "react";
import type { Trajectory } from "./compiler";
import { toPositions, type Positions } from "./orion";

export const reducedMotion = () =>
  typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;

/** The compiled state at time t, interpolated between the 50 Hz samples the compiler printed. */
export function stateAt(traj: Trajectory, t: number) {
  const s = traj.samples;
  const dt = 1 / traj.control_rate_hz;
  const i = Math.max(0, Math.min(s.length - 2, Math.floor(t / dt)));
  const a = s[i];
  const b = s[i + 1] ?? a;
  const span = b.time_from_start - a.time_from_start || 1;
  const f = Math.max(0, Math.min(1, (t - a.time_from_start) / span));
  const mix = (x: number[], y: number[]) => x.map((v, k) => v + (y[k] - v) * f);
  return {
    positions: toPositions(mix(a.positions, b.positions)) as Positions,
    velocities: mix(a.velocities, b.velocities),
    accelerations: mix(a.accelerations, b.accelerations),
    keyframe: a.keyframe_index,
    tick: i,
  };
}

/** Whether an element is on screen, so off-screen explainers stop animating and leave the page responsive. */
// Returns a ref callback for the element to watch; it follows the element if React replaces it.
export function useOnScreen() {
  const [el, setEl] = useState<Element | null>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOn(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, [el]);
  return [setEl, on] as const;
}

/**
 * Plays a trajectory in real time (or slowed down). Starts paused for readers who asked for reduced motion.
 * `loop` waits a moment at the end, then starts again. While `active` is false (off screen) time stands still.
 */
export function usePlayback(traj: Trajectory | null, { speed = 1, loop = false, autoplay = true, active = true } = {}) {
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const clock = useRef({ t: 0, last: 0, raf: 0, pauseUntil: 0 });

  useEffect(() => {
    clock.current.t = 0;
    setT(0);
    setPlaying(!!traj && autoplay && !reducedMotion());
  }, [traj, autoplay]);

  useEffect(() => {
    if (!playing || !traj || !active) return;
    const c = clock.current;
    c.last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - c.last) / 1000));
      c.last = now;
      if (now < c.pauseUntil) {
        c.raf = requestAnimationFrame(frame);
        return;
      }
      c.t += dt * speed;
      if (c.t >= traj.duration_seconds) {
        if (loop) {
          c.t = 0;
          c.pauseUntil = now + 900;
        } else {
          c.t = traj.duration_seconds;
          setT(c.t);
          setPlaying(false);
          return;
        }
      }
      setT(c.t);
      c.raf = requestAnimationFrame(frame);
    };
    c.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(c.raf);
  }, [playing, traj, speed, loop, active]);

  const seek = useCallback((time: number) => {
    clock.current.t = time;
    setT(time);
  }, []);
  const play = useCallback(() => {
    if (traj && clock.current.t >= traj.duration_seconds - 1e-6) seek(0);
    setPlaying(true);
  }, [traj, seek]);
  const pause = useCallback(() => setPlaying(false), []);

  return { t, playing, play, pause, seek };
}

/**
 * Steps through a fixed sequence (a pipeline, a story), `seconds` per step, with `at` running 0 to 1 within the
 * step. Paused for readers who asked for reduced motion, and while off screen.
 */
export function useSteps(count: number, seconds = 1.6, { loop = true, active = true } = {}) {
  const [step, setStep] = useState(0);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(() => !reducedMotion());
  const clock = useRef({ step: 0, at: 0, raf: 0, last: 0 });

  useEffect(() => {
    if (!playing || !active) return;
    const c = clock.current;
    c.last = performance.now();
    const frame = (now: number) => {
      c.at += Math.min(0.1, (now - c.last) / 1000) / seconds;
      c.last = now;
      if (c.at >= 1) {
        c.at = 0;
        c.step += 1;
        if (c.step >= count) {
          if (!loop) {
            c.step = count - 1;
            c.at = 1;
            setStep(c.step);
            setAt(1);
            setPlaying(false);
            return;
          }
          c.step = 0;
        }
        setStep(c.step);
      }
      setAt(c.at);
      c.raf = requestAnimationFrame(frame);
    };
    c.raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(c.raf);
  }, [playing, active, count, seconds, loop]);

  const go = useCallback((n: number) => {
    clock.current.step = Math.max(0, Math.min(count - 1, n));
    clock.current.at = 0;
    setStep(clock.current.step);
    setAt(0);
  }, [count]);
  return { step, at, playing, play: () => setPlaying(true), pause: () => setPlaying(false), go };
}
