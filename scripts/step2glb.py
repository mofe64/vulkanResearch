"""Convert Orion V2 component STEP exports (assembly coordinates, mm, Z-up) into one binary glTF (m, Y-up).

The parts are grouped under a joint hierarchy (shoulder -> elbow -> wrist), each joint a glTF node placed on its
pitch axis, so the arm can be posed here and animated later in the browser.

usage: step2glb.py <step dir> <out.glb> [shoulder=-20,elbow=65,wrist=-30]   (degrees; + tips toward the face)
"""
import json, math, os, struct, sys
import numpy as np
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location

STEP_DIR, OUT = sys.argv[1], sys.argv[2]
POSE = {"shoulder": -20.0, "elbow": 65.0, "wrist": -30.0}
if len(sys.argv) > 3:
    POSE.update({k: float(v) for k, v in (kv.split("=") for kv in sys.argv[3].split(","))})

# Joint pivots (glTF metres, Y-up), measured from the flush horn caps that sit on each servo axis.
# Every pitch joint turns about the X axis. Parts are matched by the start of their file name.
JOINTS = [
    ("shoulder", 0.123, ("10 ", "22 shoulder")),
    ("elbow", 0.273, ("13 ", "22 elbow")),
    ("wrist", 0.384, ("16 ", "17 ", "18 ", "19 ", "20 ", "21 ", "24 ", "22 Wrist")),
]
def joint_of(name):
    for j, (_, _, prefixes) in enumerate(JOINTS):
        if name.startswith(prefixes):
            return j
    return -1  # base
LIN, ANG = 0.15, 0.35  # mm chord deviation, radians

LIGHT = ("01 ", "02 ", "03 ", "04 ", "04b", "05 ", "06 ", "20 ", "21 ", "24 ")
MATERIALS = [
    {"name": "light", "pbrMetallicRoughness": {"baseColorFactor": [0.90, 0.90, 0.88, 1], "metallicFactor": 0, "roughnessFactor": 0.65}},
    {"name": "dark", "pbrMetallicRoughness": {"baseColorFactor": [0.13, 0.13, 0.14, 1], "metallicFactor": 0, "roughnessFactor": 0.55}},
]

def mesh_step(path):
    r = STEPControl_Reader()
    if r.ReadFile(path) != IFSelect_RetDone:
        raise RuntimeError("cannot read " + path)
    r.TransferRoots()
    shape = r.OneShape()
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
    # mm Z-up -> m Y-up: (x, y, z) -> (x, z, -y)
    P = np.stack([P[:, 0], P[:, 2], -P[:, 1]], axis=1) * 0.001
    N = np.stack([N[:, 0], N[:, 2], -N[:, 1]], axis=1)
    return P.astype(np.float32), N.astype(np.float32), I.astype(np.uint32).ravel()

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
files = sorted(f for f in os.listdir(STEP_DIR) if f.lower().endswith((".step", ".stp")))
total = 0
for f in files:
    P, N, I = mesh_step(os.path.join(STEP_DIR, f))
    name = os.path.splitext(f)[0]
    vp = add_view(P.tobytes(), 34962); vn = add_view(N.tobytes(), 34962); vi = add_view(I.tobytes(), 34963)
    a0 = len(gltf["accessors"])
    gltf["accessors"] += [
        {"bufferView": vp, "componentType": 5126, "count": len(P), "type": "VEC3", "min": P.min(0).tolist(), "max": P.max(0).tolist()},
        {"bufferView": vn, "componentType": 5126, "count": len(N), "type": "VEC3"},
        {"bufferView": vi, "componentType": 5125, "count": len(I), "type": "SCALAR"},
    ]
    mat = 0 if name.startswith(LIGHT) else 1
    gltf["meshes"].append({"name": name, "primitives": [{"attributes": {"POSITION": a0, "NORMAL": a0 + 1}, "indices": a0 + 2, "material": mat}]})
    parts.append((name, len(gltf["meshes"]) - 1))
    total += len(I) // 3
    mn, mx = (P.min(0) * 1000).round(), (P.max(0) * 1000).round()
    print(f"{name:45s} {len(I)//3:7d} tris  x {mn[0]:5.0f}..{mx[0]:5.0f}  y(up) {mn[1]:5.0f}..{mx[1]:5.0f}  z {mn[2]:5.0f}..{mx[2]:5.0f}  {MATERIALS[mat]['name']}")

# Build the hierarchy: base parts at the root; each joint node sits on its pivot (relative to the parent joint)
# and holds its parts offset back by the pivot, so the joint's rotation turns them about the axis.
def quat_x(deg):
    a = math.radians(deg) / 2
    return [math.sin(a), 0.0, 0.0, math.cos(a)]

def add_node(node):
    gltf["nodes"].append(node)
    return len(gltf["nodes"]) - 1

root_children = [add_node({"name": n, "mesh": m}) for n, m in parts if joint_of(n) == -1]
parent_children, parent_y = root_children, 0.0
for j, (jname, y, _) in enumerate(JOINTS):
    kids = [add_node({"name": n, "mesh": m, "translation": [0, -y, 0]}) for n, m in parts if joint_of(n) == j]
    node = {"name": jname, "translation": [0, y - parent_y, 0], "rotation": quat_x(POSE[jname]), "children": kids}
    idx = add_node(node)
    parent_children.append(idx)
    parent_children, parent_y = node["children"], y
gltf["scenes"][0]["nodes"] = [add_node({"name": "Orion V2", "children": root_children})]
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
print(f"{len(files)} parts, {total} triangles, {os.path.getsize(OUT)/1e6:.1f} MB -> {OUT}")
