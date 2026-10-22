import { useEffect, useState } from "react";
import RobotView from "../kit/RobotView";
import type { JointState } from "../kit/compiler";
import { JOINTS, POSES, zeros } from "../kit/orion";
import { stateAt, usePlayback, useOnScreen } from "../kit/playback";
import { useCompiled } from "../kit/useCompiled";
import "../kit/kit.css";

// Orion's movement priorities, highest first (docs/motion-architecture.md), each with a motion to stand for it.
const LEVELS = [
  { name: "Stop", owner: "Stop", motion: "return_home", example: "Stop pressed in Studio" },
  { name: "Foreground", owner: "an explicit motion", motion: "look_at_left_expressive", example: "\"Look to your left\"" },
  { name: "Speech", owner: "speech", motion: "speak_calm_sway", example: "Orion replying" },
  { name: "Attention", owner: "listening", motion: "listen_lean_in", example: "You start talking" },
  { name: "Background", owner: "idle", motion: "idle_breathe", example: "Nothing else going on" },
];

const home = POSES.home.positions;

/**
 * Ask for movement at different priorities. A higher priority takes over at once, starting from exactly where the lamp
 * is and how fast it's moving; a lower one is turned away until the higher one finishes.
 */
export default function PriorityLadder() {
  const [run, setRun] = useState<{ level: number; start: JointState; n: number } | null>(null);
  const [log, setLog] = useState<string[]>(["Waiting. Pick something for Orion to do."]);
  const { traj } = useCompiled(run ? { motion: LEVELS[run.level].motion, start: run.start } : null, run ? `${run.level}-${run.n}` : "none");
  const [box, onScreen] = useOnScreen();
  const play = usePlayback(traj, { active: onScreen });
  const now = traj ? stateAt(traj, play.t) : null;
  const active = run && traj && (play.playing || play.t < traj.duration_seconds - 1e-3) ? run.level : null;
  const say = (line: string) => setLog((l) => [line, ...l].slice(0, 4));

  useEffect(() => {
    if (traj && run && !play.playing && play.t >= traj.duration_seconds - 1e-3) say(`${LEVELS[run.level].name} finished; the lamp is free.`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [play.playing]);

  const ask = (level: number) => {
    if (active !== null && level > active) {
      say(`${LEVELS[level].name} refused: ${LEVELS[active].owner} has the lamp.`);
      return;
    }
    // Hand over from the current commanded state: same angles, same speeds, so the switch has no jump.
    const positions = now?.positions ?? home;
    const velocities = now ? Object.fromEntries(JOINTS.map((j, i) => [j, now.velocities[i]])) : zeros();
    say(active !== null ? `${LEVELS[level].name} took over from ${LEVELS[active].owner}.` : `${LEVELS[level].name} started.`);
    setRun({ level, start: { positions, velocities, anchor: home }, n: (run?.n ?? 0) + 1 });
  };

  return (
    <figure className="lx" ref={box}>
      <RobotView joints={now?.positions ?? home} label="Orion responding to movement requests" />
      <div className="lx-body">
        <ol className="lx-ladder">
          {LEVELS.map((l, i) => (
            <li key={l.name} className={active === i ? "is-on" : ""}>
              <button type="button" className="lx-btn" onClick={() => ask(i)}>{l.name}</button>
              <span className="lx-note">{l.example} · <code>{l.motion}</code></span>
            </li>
          ))}
        </ol>
        <ul className="lx-log" aria-live="polite">
          {log.map((line, i) => <li key={i} className={i === 0 ? "is-new" : ""}>{line}</li>)}
        </ul>
      </div>
      <figcaption className="lx-caption">Start an idle, then press a higher level while it runs. Then try a lower level while something higher is moving.</figcaption>
    </figure>
  );
}
