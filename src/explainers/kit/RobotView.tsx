import { useEffect, useRef, useState } from "react";
import { createRobotView, hasWebGL, type RobotView as View } from "./robot3d";

interface Props {
  /** Orion joint angles in radians. */
  joints: Partial<Record<string, number>>;
  /** A joint whose moving parts are tinted orange. */
  highlight?: string | null;
  camera?: "three-quarter" | "front" | "side";
  label: string;
  className?: string;
}

/**
 * The 3D lamp, posed by `joints`. Shows a still picture until three.js and the model arrive, and keeps it for readers
 * whose browser has no WebGL.
 */
export default function RobotView({ joints, highlight = null, camera = "three-quarter", label, className }: Props) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<View | null>(null);
  const [ready, setReady] = useState(false);
  const latest = useRef({ joints, highlight, camera });
  latest.current = { joints, highlight, camera };

  useEffect(() => {
    if (!hasWebGL() || !host.current) return;
    let cancelled = false;
    createRobotView(host.current, latest.current.joints).then((v) => {
      if (cancelled) return v.dispose();
      view.current = v;
      v.highlight(latest.current.highlight);
      v.view(latest.current.camera);
      setReady(true);
    });
    return () => {
      cancelled = true;
      view.current?.dispose();
      view.current = null;
    };
  }, []);

  useEffect(() => view.current?.setJoints(joints), [joints]);
  useEffect(() => view.current?.highlight(highlight), [highlight]);
  useEffect(() => view.current?.view(camera), [camera]);

  return (
    <div ref={host} className={`lx-robot ${ready ? "is-ready" : ""} ${className ?? ""}`} role="img" aria-label={label}>
      {!ready && <img className="lx-robot-poster" src="/art/orion-v2-poster.png" alt="" />}
    </div>
  );
}
