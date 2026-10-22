// Cuts one movement out of a servo tracking capture from the real lamp, for the "asked vs actual" explainer.
//   node scripts/servo-tracking-sample.mjs <capture.jsonl> > src/data/orion/servo-tracking.json
// Picks the run whose commanded head pitch swings the most, and keeps time, commanded and measured angles per joint.
import { readFileSync } from "node:fs";

const lines = readFileSync(process.argv[2], "utf8").trim().split("\n").map((l) => JSON.parse(l));
const header = lines.find((l) => l.kind === "header");
const runs = new Map();
for (const s of lines) {
  if (s.kind !== "sample" || !s.joints) continue;
  if (!runs.has(s.run_id)) runs.set(s.run_id, []);
  runs.get(s.run_id).push(s);
}
const swing = (samples, joint) => {
  const v = samples.map((s) => s.joints[joint].commanded_position_rad);
  return Math.max(...v) - Math.min(...v);
};
const [runId, samples] = [...runs].sort((a, b) => swing(b[1], "head_pitch_joint") - swing(a[1], "head_pitch_joint"))[0];
const t0 = samples[0].elapsed_seconds;
const round = (x) => Math.round(x * 1e5) / 1e5;
const joints = Object.keys(samples[0].joints);
console.log(JSON.stringify({
  source: "Orion servo tracking capture, 27 Sep 2026",
  update_hz: header?.update_hz ?? 50,
  run_id: runId,
  motion: samples[0].motion_name,
  t: samples.map((s) => round(s.elapsed_seconds - t0)),
  joints: Object.fromEntries(joints.map((j) => [j, {
    commanded: samples.map((s) => round(s.joints[j].commanded_position_rad)),
    measured: samples.map((s) => round(s.joints[j].measured_position_rad)),
  }])),
}));
