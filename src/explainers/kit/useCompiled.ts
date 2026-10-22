import { useEffect, useState } from "react";
import { compileMotion, type CompileRequest, type Trajectory } from "./compiler";

/**
 * Compiles a motion with Orion's compiler whenever `request` changes (compare by `key`, a string that changes when
 * the request does). Keeps the last good trajectory while a new one compiles, and Orion's message when it refuses.
 */
export function useCompiled(request: CompileRequest | null, key: string) {
  const [traj, setTraj] = useState<Trajectory | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!request) return;
    let live = true;
    compileMotion(request)
      .then((t) => live && (setTraj(t), setError(null)))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return { traj, error };
}

/** Keyframe arrival times of a trajectory, from the first sample of each keyframe. */
export function keyframeTimes(traj: Trajectory) {
  const marks: { t: number; label: string }[] = [];
  let last = -1;
  for (const s of traj.samples) {
    if (s.keyframe_index !== last) {
      if (last >= 0) marks.push({ t: s.time_from_start, label: `${last + 1}` });
      last = s.keyframe_index;
    }
  }
  marks.push({ t: traj.duration_seconds, label: `${last + 1}` });
  return marks;
}

/** One joint's position (or velocity, acceleration) over time, as chart points. */
export function series(traj: Trajectory, joint: number, field: "positions" | "velocities" | "accelerations" = "positions", scale = 1) {
  return traj.samples.map((s) => [s.time_from_start, s[field][joint] * scale] as [number, number]);
}
