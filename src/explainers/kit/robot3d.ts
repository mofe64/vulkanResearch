/**
 * Orion's 3D model for lesson explainers, posed in Orion's own joint angles.
 *
 * A page can show the lamp in several explainers at once, but browsers allow only a handful of WebGL contexts.
 * So one hidden renderer draws every view in turn and each view copies the result into its own plain canvas.
 * three.js and the model load once, the first time any view asks for them.
 */
import type * as THREE_NS from "three";

type Three = typeof THREE_NS;
type JointValues = Partial<Record<string, number>>;

const MODEL = "/models/orion-v2.glb";
const INK = 0x3b3632;

/**
 * How each Orion joint maps onto the model's joint nodes (made by scripts/step2glb.py).
 * The model is drawn in its CAD pose; Orion's zero is the folded rest pose. The offsets below are the rest pose's
 * angles in the CAD frame, from Orion's robot description (orion/description/urdf/orion-v2.urdf), and `sign` turns a
 * joint's own axis into the node's axis (the yaw and swivel axes point down in the robot description).
 */
const NODE_OF: Record<string, { node: string; axis: "x" | "y"; offset: number; sign: 1 | -1 }> = {
  base_yaw_joint: { node: "yaw", axis: "y", offset: -0.04908738521234052, sign: -1 },
  shoulder_pitch_joint: { node: "shoulder", axis: "x", offset: -1.5980932991569734, sign: 1 },
  elbow_pitch_joint: { node: "elbow", axis: "x", offset: 2.297002562636047, sign: 1 },
  head_pitch_joint: { node: "wrist", axis: "x", offset: 0.08911356580737373, sign: 1 },
  head_roll_joint: { node: "roll", axis: "y", offset: 0.01380582709097077, sign: -1 },
};

interface Shared {
  THREE: Three;
  OrbitControls: typeof import("three/addons/controls/OrbitControls.js").OrbitControls;
  renderer: THREE_NS.WebGLRenderer;
  model: THREE_NS.Object3D;
  materials: { surface: THREE_NS.Material; heat: THREE_NS.Material };
}

let shared: Promise<Shared> | null = null;

function loadShared(): Promise<Shared> {
  return (shared ??= (async () => {
    const THREE = await import("three");
    const { GLTFLoader } = await import("three/addons/loaders/GLTFLoader.js");
    const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");
    const { MeshoptDecoder } = await import("three/addons/libs/meshopt_decoder.module.js");
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(MODEL);
    const model = gltf.scene;

    // The site's "ink" look: white surfaces, dark lines where faces meet. Edge lines are built once and shared by
    // every copy of the model, since copies share geometry.
    const materials = {
      surface: new THREE.MeshLambertMaterial({ color: 0xffffff, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
      heat: new THREE.MeshLambertMaterial({ color: 0xf6d2c2, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
    };
    const line = new THREE.LineBasicMaterial({ color: INK });
    model.traverse((o) => {
      const mesh = o as THREE_NS.Mesh;
      if (mesh.isMesh) {
        mesh.material = materials.surface;
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 30), line));
      }
    });
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    return { THREE, OrbitControls, renderer, model, materials };
  })());
}

export function hasWebGL() {
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

export interface RobotView {
  /** Pose the lamp in Orion joint angles (radians). Missing joints keep their angle. */
  setJoints(values: JointValues): void;
  /** Tint the parts that a joint moves (the joint and everything it carries), or nothing. */
  highlight(joint: string | null): void;
  /** Look from the front, the side or the usual three-quarter view. */
  view(name: "three-quarter" | "front" | "side"): void;
  dispose(): void;
}

const VIEWS = {
  "three-quarter": [0.55, 0.42, 0.75],
  front: [0, 0.3, 1],
  side: [1, 0.3, 0],
} as const;

/** Mounts a view of the lamp into `host` (an element with a size). Resolves once the model is on screen. */
export async function createRobotView(host: HTMLElement, initial: JointValues = {}): Promise<RobotView> {
  const { THREE, OrbitControls, renderer, model: source, materials } = await loadShared();
  const model = source.clone(true);
  const nodes = Object.fromEntries(Object.entries(NODE_OF).map(([j, m]) => [j, model.getObjectByName(m.node)!]));

  const scene = new THREE.Scene();
  scene.add(model);
  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d6cf, 2.2));
  const sun = new THREE.DirectionalLight(0xffffff, 0.8);
  sun.position.set(2, 3, 2);
  scene.add(sun);

  // Frame the lamp standing at its home height: centre ~0.22 m up, the arm sweeps about 0.3 m around the base.
  const target = new THREE.Vector3(0, 0.2, 0);
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 20);
  const distance = 1.35;
  const placeCamera = (name: keyof typeof VIEWS) => {
    const d = new THREE.Vector3(...VIEWS[name]).normalize().multiplyScalar(distance);
    camera.position.copy(target).add(d);
    camera.lookAt(target);
  };
  placeCamera("three-quarter");

  const canvas = document.createElement("canvas");
  canvas.className = "robot-canvas";
  host.append(canvas);
  const ctx = canvas.getContext("2d")!;
  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(target);
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.update();

  let visible = false;
  let dirty = true;
  const draw = () => {
    if (!visible || !dirty) return;
    dirty = false;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    const ratio = renderer.getPixelRatio();
    if (canvas.width !== Math.round(w * ratio) || canvas.height !== Math.round(h * ratio)) {
      canvas.width = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
    }
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(renderer.domElement, 0, 0, canvas.width, canvas.height);
  };
  const invalidate = () => {
    dirty = true;
    requestAnimationFrame(draw);
  };
  controls.addEventListener("change", invalidate);
  const io = new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    invalidate();
  });
  io.observe(canvas);
  const ro = new ResizeObserver(invalidate);
  ro.observe(canvas);

  const view: RobotView = {
    setJoints(values) {
      for (const [joint, value] of Object.entries(values)) {
        const map = NODE_OF[joint];
        if (!map || value === undefined) continue;
        nodes[joint].rotation.set(0, 0, 0);
        nodes[joint].rotation[map.axis] = map.offset + map.sign * value;
      }
      invalidate();
    },
    highlight(joint) {
      const lit = joint ? nodes[joint] : null;
      model.traverse((o) => {
        const mesh = o as THREE_NS.Mesh;
        if (!mesh.isMesh) return;
        let carried = false;
        for (let p: THREE_NS.Object3D | null = mesh; p; p = p.parent) if (p === lit) carried = true;
        mesh.material = carried ? materials.heat : materials.surface;
      });
      invalidate();
    },
    view(name) {
      placeCamera(name);
      controls.update();
      invalidate();
    },
    dispose() {
      io.disconnect();
      ro.disconnect();
      controls.dispose();
      canvas.remove();
    },
  };
  view.setJoints(initial);
  return view;
}
