/**
 * Orion's joints, poses, motions and styles, as loaded by Orion's own code (src/data/orion/catalog.json, written by
 * scripts/build-motion-wasm.sh), plus the plain-language names the lessons use for them.
 */
import catalog from "../../data/orion/catalog.json";

export type JointName = "base_yaw_joint" | "shoulder_pitch_joint" | "elbow_pitch_joint" | "head_roll_joint" | "head_pitch_joint";
export type Positions = Record<JointName, number>;

export interface Keyframe {
  pose: string | null;
  target: Partial<Positions>;
  duration: number;
  arrival: "through" | "settle";
  hold: number;
  marker: string | null;
}

export interface Motion {
  name: string;
  description: string;
  space: "absolute" | "anchor_relative";
  style: string;
  keyframes: Keyframe[];
}

export interface Style {
  name: string;
  tempo: number;
  tangent_tension: number;
  joint_lag: number;
  amplitude: number;
  overshoot_scale: number;
  settle_character: number;
}

/** Orion's canonical joint order, the order of every sample the compiler prints. */
export const JOINTS: JointName[] = [
  "base_yaw_joint",
  "shoulder_pitch_joint",
  "elbow_pitch_joint",
  "head_roll_joint",
  "head_pitch_joint",
];

/** What a reader calls each joint, and what it does. */
export const JOINT_INFO: Record<JointName, { label: string; does: string }> = {
  base_yaw_joint: { label: "Base turn", does: "turns the whole arm left and right" },
  shoulder_pitch_joint: { label: "Shoulder", does: "raises and lowers the lower arm" },
  elbow_pitch_joint: { label: "Elbow", does: "bends the upper arm" },
  head_pitch_joint: { label: "Head nod", does: "tips the head up and down" },
  head_roll_joint: { label: "Head swivel", does: "turns the head on its neck" },
};

/** The order the lessons list joints in: from the base up. */
export const JOINTS_BASE_UP: JointName[] = [
  "base_yaw_joint",
  "shoulder_pitch_joint",
  "elbow_pitch_joint",
  "head_pitch_joint",
  "head_roll_joint",
];

export const LIMITS = Object.fromEntries(
  catalog.joints.map((j) => [j.name, { lower: j.lower_rad, upper: j.upper_rad, servo: j.servo_id }]),
) as Record<JointName, { lower: number; upper: number; servo: number }>;

export const POSES = Object.fromEntries(catalog.poses.map((p) => [p.name, p])) as Record<
  string,
  { name: string; description: string; tags: string[]; positions: Positions }
>;
export const MOTIONS = Object.fromEntries(catalog.motions.map((m) => [m.name, m as Motion])) as Record<string, Motion>;
export const STYLES = catalog.styles as Style[];
export const ORION_REVISION = catalog.revision;

/** The servo speed limit the compiler plans under (Feetech STS3215 at 7.4 V, 52 RPM). */
export const MAX_SPEED_RAD_S = 5.445427266222309;
export const CONTROL_RATE_HZ = 50;

export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (deg: number) => (deg * Math.PI) / 180;
export const clampToLimits = (joint: JointName, value: number) =>
  Math.min(LIMITS[joint].upper, Math.max(LIMITS[joint].lower, value));

export const cloneMotion = (m: Motion): Motion => JSON.parse(JSON.stringify(m));

/** Writes a motion in Orion's motion file format (format_version 2), the same file a reader could put on their lamp. */
export function motionYaml(m: Motion): string {
  const num = (x: number) => String(Math.round(x * 1e6) / 1e6);
  const lines = [
    "format_version: 2",
    "motion:",
    `  name: ${m.name}`,
    `  description: ${JSON.stringify(m.description)}`,
    `  space: ${m.space}`,
    `  style: ${m.style}`,
  ];
  if (m.space === "anchor_relative") lines.push("  return_to_anchor: true");
  lines.push("  keyframes:");
  for (const k of m.keyframes) {
    if (m.space === "absolute") lines.push(`  - pose: ${k.pose}`);
    else {
      const offsets = JOINTS.filter((j) => k.target[j]).map((j) => `${j}: ${num(k.target[j]!)}`);
      lines.push(`  - offsets: {${offsets.join(", ")}}`);
    }
    lines.push(`    duration: ${num(k.duration)}`, `    arrival: ${k.arrival}`);
    if (k.hold > 0) lines.push(`    hold: ${num(k.hold)}`);
    if (k.marker) lines.push(`    marker: ${k.marker}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Joint angles as a map, from one sample's array in canonical order. */
export const toPositions = (values: number[]) =>
  Object.fromEntries(JOINTS.map((j, i) => [j, values[i]])) as Positions;
export const zeros = () => Object.fromEntries(JOINTS.map((j) => [j, 0])) as Positions;
