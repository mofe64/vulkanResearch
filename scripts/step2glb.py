"""Convert Orion component STEP exports (assembly coordinates, mm, Z-up) into one binary glTF (m, Y-up).

The parts are grouped under a joint hierarchy (shoulder -> elbow -> wrist), each joint a glTF node placed on its
pitch axis, so the arm can be posed here and animated later in the browser.

usage: step2glb.py <step dir> <out.glb> [shoulder=-20,elbow=65,wrist=-30] [--hardware hardware.json]
       (pose in degrees; + tips toward the face)

Parts printed as two halves (the arms) are split into one mesh per half, named with a/b after the part number
("OR21-10a-..." is the half on the -X side), so a guide can show a servo going into one half before the other closes.
--hardware adds bought parts (servos, horns, camera, ...) from STL meshes in the same CAD frame; see
scripts/orion-hardware.json for the format.
"""
import json, math, os, re, struct, sys
import numpy as np
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED, TopAbs_SOLID
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location

args = sys.argv[1:]
HARDWARE = None
if "--hardware" in args:
    i = args.index("--hardware")
    HARDWARE = args[i + 1]
    del args[i:i + 2]
STEP_DIR, OUT = args[0], args[1]
POSE = {"shoulder": -20.0, "elbow": 65.0, "wrist": -30.0}
if len(args) > 2:
    POSE.update({k: float(v) for k, v in (kv.split("=") for kv in args[2].split(","))})

# Every pitch joint turns about the X axis. Parts are matched by part number at the start of their file name,
# with any revision prefix dropped: "OR21-10-lower-arm" and "10 lower straight bridge" are both part "10 ...".
# The pivot heights (glTF metres, Y-up) are measured from the flush horn caps (part 22) that sit on each servo
# axis, so a CAD change that moves a joint needs no edit here; the numbers below are only the fallback.
JOINTS = [
    ["shoulder", 0.123, ("10 ", "10a ", "10b ", "22 shoulder")],
    ["elbow", 0.273, ("13 ", "13a ", "13b ", "22 elbow")],
    ["wrist", 0.404, ("16 ", "17 ", "18 ", "19 ", "20 ", "21 ", "24 ", "22 wrist")],
]
def part_key(name):
    """'OR21-22-elbow-left-elbow-cap-left' -> '22 elbow left elbow cap left'."""
    return re.sub(r"^[a-z]+\d*-", "", name.lower()).replace("-", " ")
JOINT_OF_NAME = {}  # explicit joints for hardware meshes
def joint_of(name):
    if name in JOINT_OF_NAME:
        return JOINT_OF_NAME[name]
    key = part_key(name)
    for j, (_, _, prefixes) in enumerate(JOINTS):
        if key.startswith(prefixes):
            return j
    return -1  # base
LIN, ANG = 0.15, 0.35  # mm chord deviation, radians
SPLIT = ("10 ", "13 ")  # two-half printed parts: one mesh per solid

LIGHT = ("01 ", "02 ", "03 ", "04 ", "04b", "05 ", "06 ", "20 ", "21 ", "24 ")
def is_light(name):
    return part_key(name).startswith(LIGHT)
MATERIALS = [
    {"name": "light", "pbrMetallicRoughness": {"baseColorFactor": [0.90, 0.90, 0.88, 1], "metallicFactor": 0, "roughnessFactor": 0.65}},
    {"name": "dark", "pbrMetallicRoughness": {"baseColorFactor": [0.13, 0.13, 0.14, 1], "metallicFactor": 0, "roughnessFactor": 0.55}},
    {"name": "hardware", "pbrMetallicRoughness": {"baseColorFactor": [0.35, 0.36, 0.38, 1], "metallicFactor": 0.3, "roughnessFactor": 0.5}},
]

def read_step(path):
    r = STEPControl_Reader()
    if r.ReadFile(path) != IFSelect_RetDone:
        raise RuntimeError("cannot read " + path)
    r.TransferRoots()
    return r.OneShape()

def solids_of(shape):
    out, e = [], TopExp_Explorer(shape, TopAbs_SOLID)
    while e.More():
        out.append(e.Current()); e.Next()
    return out

def mesh_shape(shape):
    BRepMesh_IncrementalMesh(shape, LIN, False, ANG, True)
    P, N, I = [], [], []
    base = 0
    exp = TopExp_Explorer(shape, TopAbs_FACE)
    while exp.More():
        face = TopoDS.Face(exp.Current())
        loc = TopLoc_Location()
        tri = BRep_Tool.Triangulation_s(face, loc)
        exp.Next()
        if tri is None:
            continue
        trsf = loc.Transformation()
        pts = np.array([[*tri.Node(i).Transformed(trsf).Coord()] for i in range(1, tri.NbNodes() + 1)], dtype=np.float64)
        tris = np.array([tri.Triangle(i).Get() for i in range(1, tri.NbTriangles() + 1)], dtype=np.int64) - 1
        if face.Orientation() == TopAbs_REVERSED:
            tris = tris[:, [0, 2, 1]]
        # smooth normals within the face, sharp between faces (faces have separate vertices)
        fn = np.cross(pts[tris[:, 1]] - pts[tris[:, 0]], pts[tris[:, 2]] - pts[tris[:, 0]])
        vn = np.zeros_like(pts)
        for k in range(3):
            np.add.at(vn, tris[:, k], fn)
        vn /= np.maximum(np.linalg.norm(vn, axis=1, keepdims=True), 1e-12)
        P.append(pts); N.append(vn); I.append(tris + base)
        base += len(pts)
    P, N, I = np.concatenate(P), np.concatenate(N), np.concatenate(I)
    return to_gltf(P * 0.001, N, I)

def to_gltf(P, N, I):
    """CAD metres, Z up -> glTF metres, Y up: (x, y, z) -> (x, z, -y)."""
    P = np.stack([P[:, 0], P[:, 2], -P[:, 1]], axis=1)
    N = np.stack([N[:, 0], N[:, 2], -N[:, 1]], axis=1)
    return P.astype(np.float32), N.astype(np.float32), I.astype(np.uint32).ravel()

def read_stl(path):
    """Binary STL -> vertices (n, 3, 3) in the file's units."""
    data = open(path, "rb").read()
    n = struct.unpack("<I", data[80:84])[0]
    rec = np.frombuffer(data[84:84 + 50 * n], dtype=np.dtype([("n", "<3f4"), ("v", "<9f4"), ("a", "<u2")]))
    return rec["v"].reshape(-1, 3, 3).astype(np.float64)

def mesh_triangles(T, grid):
    """Triangles (n, 3, 3) -> indexed mesh with flat-ish normals, merging vertices on a grid (metres).
    The merge is a cheap simplification: supplier models are far more detailed than a web view needs."""
    q = np.round(T.reshape(-1, 3) / grid).astype(np.int64)
    keys, inv = np.unique(q, axis=0, return_inverse=True)
    P = keys.astype(np.float64) * grid
    I = inv.reshape(-1, 3)
    I = I[(I[:, 0] != I[:, 1]) & (I[:, 1] != I[:, 2]) & (I[:, 0] != I[:, 2])]
    fn = np.cross(P[I[:, 1]] - P[I[:, 0]], P[I[:, 2]] - P[I[:, 0]])
    N = np.zeros_like(P)
    for k in range(3):
        np.add.at(N, I[:, k], fn)
    N /= np.maximum(np.linalg.norm(N, axis=1, keepdims=True), 1e-12)
    return to_gltf(P, N, I)

gltf = {"asset": {"version": "2.0", "generator": "vulkan-research step2glb"}, "scene": 0, "scenes": [{"nodes": []}],
        "nodes": [], "meshes": [], "materials": MATERIALS, "accessors": [], "bufferViews": [], "buffers": []}
blob = bytearray()

def add_view(data, target):
    while len(blob) % 4:
        blob.append(0)
    gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(data), "target": target})
    blob.extend(data)
    return len(gltf["bufferViews"]) - 1

parts = []
total = 0
def add_part(name, P, N, I, mat):
    global total
    vp = add_view(P.tobytes(), 34962); vn = add_view(N.tobytes(), 34962); vi = add_view(I.tobytes(), 34963)
    a0 = len(gltf["accessors"])
    gltf["accessors"] += [
        {"bufferView": vp, "componentType": 5126, "count": len(P), "type": "VEC3", "min": P.min(0).tolist(), "max": P.max(0).tolist()},
        {"bufferView": vn, "componentType": 5126, "count": len(N), "type": "VEC3"},
        {"bufferView": vi, "componentType": 5125, "count": len(I), "type": "SCALAR"},
    ]
    gltf["meshes"].append({"name": name, "primitives": [{"attributes": {"POSITION": a0, "NORMAL": a0 + 1}, "indices": a0 + 2, "material": mat}]})
    parts.append((name, len(gltf["meshes"]) - 1, float((P[:, 1].min() + P[:, 1].max()) / 2)))
    total += len(I) // 3
    mn, mx = (P.min(0) * 1000).round(), (P.max(0) * 1000).round()
    print(f"{name:45s} {len(I)//3:7d} tris  x {mn[0]:5.0f}..{mx[0]:5.0f}  y(up) {mn[1]:5.0f}..{mx[1]:5.0f}  z {mn[2]:5.0f}..{mx[2]:5.0f}  {MATERIALS[mat]['name']}")

files = sorted(f for f in os.listdir(STEP_DIR) if f.lower().endswith((".step", ".stp")))
for f in files:
    name = os.path.splitext(f)[0]
    shape = read_step(os.path.join(STEP_DIR, f))
    mat = 0 if is_light(name) else 1
    solids = solids_of(shape) if part_key(name).startswith(SPLIT) else []
    if len(solids) == 2:
        # One mesh per half; "a" is the half on the -X side. Name: OR21-10-lower-arm -> OR21-10a-lower-arm.
        meshed = [mesh_shape(sol) for sol in solids]
        meshed.sort(key=lambda m: float(m[0][:, 0].mean()))
        for suffix, (P, N, I) in zip("ab", meshed):
            add_part(re.sub(r"^([A-Za-z]+\d*-\d+)", r"\g<1>" + suffix, name), P, N, I, mat)
    else:
        add_part(name, *mesh_shape(shape), mat)

# Bought parts: STL meshes in the CAD frame (metres, Z up), each assigned to the joint that carries it.
if HARDWARE:
    spec = json.load(open(HARDWARE))
    mesh_dir = os.path.join(os.path.dirname(os.path.abspath(HARDWARE)), os.path.expanduser(spec["meshDir"]))
    joint_index = {"base": -1, **{jt[0]: j for j, jt in enumerate(JOINTS)}}
    for h in spec["parts"]:
        T = read_stl(os.path.join(mesh_dir, h["file"]))
        if "rotate" in h:  # rows of a 3x3 rotation, applied about the origin
            T = T @ np.array(h["rotate"], dtype=np.float64).T
        if "fitMin" in h:  # move so the bounding box's minimum corner lands here (mm)
            T = T - T.reshape(-1, 3).min(0) + np.array(h["fitMin"]) * 0.001
        T = T + np.array(h.get("offset", [0, 0, 0])) * 0.001
        P, N, I = mesh_triangles(T, h.get("grid", 0.5) * 0.001)
        JOINT_OF_NAME[h["name"]] = joint_index[h["joint"]]
        add_part(h["name"], P, N, I, 2)

# Pivot heights from the horn caps (centre height of all caps for that joint).
for jt in JOINTS:
    caps = [cy for n, _, cy in parts if part_key(n).startswith("22 " + jt[0])]
    if caps:
        jt[1] = round(sum(caps) / len(caps), 4)
print("pivots (m):", {jt[0]: jt[1] for jt in JOINTS})

# Build the hierarchy: base parts at the root; each joint node sits on its pivot (relative to the parent joint)
# and holds its parts offset back by the pivot, so the joint's rotation turns them about the axis.
def quat_x(deg):
    a = math.radians(deg) / 2
    return [math.sin(a), 0.0, 0.0, math.cos(a)]

def add_node(node):
    gltf["nodes"].append(node)
    return len(gltf["nodes"]) - 1

root_children = [add_node({"name": n, "mesh": m}) for n, m, _ in parts if joint_of(n) == -1]
parent_children, parent_y = root_children, 0.0
for j, (jname, y, _) in enumerate(JOINTS):
    kids = [add_node({"name": n, "mesh": m, "translation": [0, -y, 0]}) for n, m, _ in parts if joint_of(n) == j]
    node = {"name": jname, "translation": [0, y - parent_y, 0], "rotation": quat_x(POSE[jname]), "children": kids}
    idx = add_node(node)
    parent_children.append(idx)
    parent_children, parent_y = node["children"], y
gltf["scenes"][0]["nodes"] = [add_node({"name": "Orion", "children": root_children})]
print("pose:", POSE)

gltf["buffers"].append({"byteLength": len(blob)})
js = json.dumps(gltf, separators=(",", ":")).encode()
js += b" " * ((4 - len(js) % 4) % 4)
while len(blob) % 4:
    blob.append(0)
with open(OUT, "wb") as fh:
    fh.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
    fh.write(struct.pack("<II", len(js), 0x4E4F534A)); fh.write(js)
    fh.write(struct.pack("<II", len(blob), 0x004E4942)); fh.write(blob)
print(f"{len(parts)} meshes, {total} triangles, {os.path.getsize(OUT)/1e6:.1f} MB -> {OUT}")
