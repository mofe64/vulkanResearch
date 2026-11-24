"""Convert the Road Runner Mini assembly STEP (one file, mm, +X forward, +Y left, +Z up) into one binary glTF
(metres, +Y up, the robot facing +Z), named so the project viewer and the assembly guide can use it.

usage: roadrunner2glb.py <biped_v02_S72.step> <out.glb>
then:  npx gltfpack -i <out.glb> -o public/models/roadrunner-mini-v1.glb -cc -kn

- Every solid whose name starts with "keepout_" is dropped: those are the CAD's plug and cable-bend keep-out boxes.
- Printed parts become one node each, named with a digit-first part number ("RR1-09l-hub-L"), so the assembly viewer
  draws them white. Left and right copies share a CAD name and are told apart by the sign of CAD Y (+Y is left).
- Bought parts are merged into one mesh per component, named "HW-<id>" ("HW-hipfl", "HW-pi"), so the viewer draws
  them grey. Supplier boards are far more detailed than a web view needs, so they are tessellated coarsely, their
  tiny solids are dropped and their vertices are merged on a grid.
"""
import os, re, struct, sys
from collections import defaultdict
import numpy as np
from OCP.STEPControl import STEPControl_Reader
from OCP.IFSelect import IFSelect_RetDone
from OCP.BRepMesh import BRepMesh_IncrementalMesh
from OCP.TopExp import TopExp_Explorer
from OCP.TopAbs import TopAbs_FACE, TopAbs_REVERSED, TopAbs_SOLID
from OCP.TopoDS import TopoDS
from OCP.BRep import BRep_Tool
from OCP.TopLoc import TopLoc_Location
from OCP.Bnd import Bnd_Box
from OCP.BRepBndLib import BRepBndLib
from OCP.BRepPrimAPI import BRepPrimAPI_MakeBox
from OCP.gp import gp_Pnt

STEP, OUT = sys.argv[1], sys.argv[2]

# Printed parts: CAD body name -> (part number, file-style name). "lr" parts exist once per side.
PRINTED = {
    "chassis_lower": ("01", "chassis-lower"),
    "chassis_upper": ("02", "chassis-upper"),
    "tray": ("03", "tray"),
    "lid": ("04", "lid"),
    "upper_deck": ("05", "upper-deck"),
    "imu_plate": ("06", "imu-plate"),
    "pitch_bracket": ("07", "pitch-bracket"),
    "head": ("08", "head"),
    "hub": ("09", "hub", "lr"),
    "lower_front_plate": ("10", "lower-front", "lr"),
    "lower_rear": ("11", "lower-rear", "lr"),
    "upper_front": ("12", "upper-front", "lr"),
    "upper_rear": ("13", "upper-rear", "lr"),
}
# Bought parts: CAD body name (without Fusion's " (n)" suffix) -> component id. A callable picks by side.
side = lambda left, right: (lambda y: left if y > 0 else right)
BOUGHT = {
    "raspberry_pi5": "pi",
    "active_cooler": "cooler",
    "oak_d_lite": "oak",
    "imu_lsm6ds3": "imu",
    "bus_servo_adapter": side("adapter1", "adapter2"),  # adapter 1 (hips and head) is rear left
    "ubec_pi_5v2": "ubec1",
    "ubec_2": "ubec2",
    "battery_3S_5200": "battery",
    "xt60_splice": "xt60",
    "fuse_holder_10A": "fuse",
    "hip_servo_front_L": "hipfl", "hip_servo_front_L_drive_horn": "hipfl", "hip_servo_front_L_idler_horn": "hipfl",
    "hip_servo_front_R": "hipfr", "hip_servo_front_R_drive_horn": "hipfr", "hip_servo_front_R_idler_horn": "hipfr",
    "hip_servo_rear_L": "hiprl", "hip_servo_rear_L_drive_horn": "hiprl", "hip_servo_rear_L_idler_horn": "hiprl",
    "hip_servo_rear_R": "hiprr", "hip_servo_rear_R_drive_horn": "hiprr", "hip_servo_rear_R_idler_horn": "hiprr",
    "wheel_servo": side("wheelservol", "wheelservor"),
    "wheel_servo_drive_horn": side("wheelservol", "wheelservor"),
    "wheel_servo_idler_horn": side("wheelservol", "wheelservor"),
    "wheel": side("wheell", "wheelr"),
    "yaw_servo": "yawservo", "yaw_servo_drive_horn": "yawservo", "yaw_servo_idler_horn": "yawservo",
    "head_servo": "pitchservo", "head_servo_drive_horn": "pitchservo", "head_servo_idler_horn": "pitchservo",
    "screw_M3_knee_f": side("kneesl", "kneesr"), "screw_M3_knee_r": side("kneesl", "kneesr"),
}
# Supplier boards with hundreds of small solids: coarse mesh, drop solids smaller than MIN_SOLID mm across.
BOARDS = {"pi", "cooler", "oak", "imu", "adapter1", "adapter2"}
MIN_SOLID = 2.5

# S72 still has a placeholder box for the fuse holder inside the left side bay, where the real holder doesn't fit.
# The build puts it on the outside of the tray's left wall, on the centre post (x -14..14), long side front to back,
# cap up, held by two zip ties through the holes at z 165-168 and 196-199. Draw it there instead, at the holder's
# 65 x 25 x 18 mm size: 18 mm off the wall's outer face (y 50), between the tie holes in height. CAD mm, world z.
FUSE_BOX = ((-32.5, 50.2, 169.5), (32.5, 68.2, 194.5))

def bbox(shape):
    b = Bnd_Box(); BRepBndLib.Add_s(shape, b)
    lo, hi = b.CornerMin(), b.CornerMax()
    return np.array([lo.X(), lo.Y(), lo.Z()]), np.array([hi.X(), hi.Y(), hi.Z()])

def tessellate(shape, lin, ang):
    """Triangles (n, 3, 3) in CAD millimetres, with outward winding."""
    BRepMesh_IncrementalMesh(shape, lin, False, ang, True)
    out = []
    exp = TopExp_Explorer(shape, TopAbs_FACE)
    while exp.More():
        face = TopoDS.Face(exp.Current()); exp.Next()
        loc = TopLoc_Location()
        tri = BRep_Tool.Triangulation_s(face, loc)
        if tri is None:
            continue
        trsf = loc.Transformation()
        pts = np.array([[*tri.Node(i).Transformed(trsf).Coord()] for i in range(1, tri.NbNodes() + 1)])
        tris = np.array([tri.Triangle(i).Get() for i in range(1, tri.NbTriangles() + 1)], dtype=np.int64) - 1
        if face.Orientation() == TopAbs_REVERSED:
            tris = tris[:, [0, 2, 1]]
        out.append(pts[tris])
    return np.concatenate(out) if out else np.zeros((0, 3, 3))

def to_gltf(T):
    """CAD mm (+X forward, +Y left, +Z up) -> glTF m (+Y up, facing +Z): (x, y, z) * 0.001 -> (y, z, x).
    A cyclic permutation has determinant +1, so triangle winding (and so the outward normals) is kept."""
    return T[..., [1, 2, 0]] * 0.001

def index_mesh(T, grid):
    """Triangles (n, 3, 3) in metres -> (P, N, I), merging vertices on a grid (a cheap simplification)."""
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
    return P.astype(np.float32), N.astype(np.float32), I.astype(np.uint32).ravel()

# ---- read the STEP and name every solid ----
reader = STEPControl_Reader()
if reader.ReadFile(STEP) != IFSelect_RetDone:
    raise SystemExit("cannot read " + STEP)
reader.TransferRoots()
shape = reader.OneShape()
tr = reader.WS().TransferReader()
model = reader.WS().Model()

# Every named solid body in the file, with the shape it was transferred to.
named_solids = []
for i in range(1, model.NbEntities() + 1):
    e = model.Value(i)
    if e.DynamicType().Name() in ("StepShape_ManifoldSolidBrep", "StepShape_BrepWithVoids"):
        s = tr.ShapeResult(e)
        if not s.IsNull():
            named_solids.append((e.Name().ToCString(), s))

def solid_name(solid):
    # -1: match the solid whatever its assembly placement.
    ent = tr.EntityFromShapeResult(solid, -1)
    if ent is not None and ent.DynamicType().Name() in ("StepShape_ManifoldSolidBrep", "StepShape_BrepWithVoids"):
        return ent.Name().ToCString()
    for name, s in named_solids:
        if s.IsPartner(solid):  # same body, any placement
            return name
    # A component with a single body (the head) is recorded against its representation relationship instead:
    # take the one solid body named inside the related representations.
    if ent is not None and ent.DynamicType().Name() == "StepRepr_ShapeRepresentationRelationship":
        found = []
        for rep in (ent.Rep1(), ent.Rep2()):
            for k in range(1, rep.NbItems() + 1):
                it = rep.ItemsValue(k)
                if it.DynamicType().Name() in ("StepShape_ManifoldSolidBrep", "StepShape_BrepWithVoids"):
                    found.append(it.Name().ToCString())
        if len(found) == 1:
            return found[0]
    return "?"

groups = defaultdict(list)  # node name -> [solid shapes]
dropped, unknown = defaultdict(int), defaultdict(int)
exp = TopExp_Explorer(shape, TopAbs_SOLID)
while exp.More():
    solid = exp.Current(); exp.Next()
    raw = solid_name(solid)
    base = re.sub(r" \(\d+\)$", "", raw)
    if base.startswith("keepout_"):
        dropped[base] += 1
        continue
    lo, hi = bbox(solid)
    y = (lo[1] + hi[1]) / 2
    if base in PRINTED:
        num, label, *lr = PRINTED[base]
        if lr:
            s = "l" if y > 0 else "r"
            name = f"RR1-{num}{s}-{label}-{s.upper()}"
        else:
            name = f"RR1-{num}-{label}"
    elif base in BOUGHT:
        hw = BOUGHT[base]
        hw = hw(y) if callable(hw) else hw
        if hw in BOARDS and np.linalg.norm(hi - lo) < MIN_SOLID:
            dropped["(tiny board solid)"] += 1
            continue
        name = f"HW-{hw}"
    else:
        unknown[f"{raw} at {lo.round().tolist()}..{hi.round().tolist()}"] += 1
        continue
    if name == "HW-fuse":
        solid = BRepPrimAPI_MakeBox(gp_Pnt(*FUSE_BOX[0]), gp_Pnt(*FUSE_BOX[1])).Shape()
    groups[name].append(solid)

print("dropped:", dict(dropped))
if unknown:
    raise SystemExit(f"unmapped solids (add them to PRINTED or BOUGHT): {dict(unknown)}")
printed = sorted(n for n in groups if n.startswith("RR1-"))
assert len(printed) == 18, f"expected 18 printed parts, found {len(printed)}: {printed}"

# ---- build the glTF ----
gltf = {"asset": {"version": "2.0", "generator": "vulkan-research roadrunner2glb"}, "scene": 0, "scenes": [{"nodes": []}],
        "nodes": [], "meshes": [], "accessors": [], "bufferViews": [], "buffers": [],
        "materials": [
            {"name": "printed", "pbrMetallicRoughness": {"baseColorFactor": [0.92, 0.92, 0.90, 1], "metallicFactor": 0, "roughnessFactor": 0.65}},
            {"name": "bought", "pbrMetallicRoughness": {"baseColorFactor": [0.35, 0.36, 0.38, 1], "metallicFactor": 0.3, "roughnessFactor": 0.5}},
        ]}
blob = bytearray()

def add_view(data, target):
    while len(blob) % 4:
        blob.append(0)
    gltf["bufferViews"].append({"buffer": 0, "byteOffset": len(blob), "byteLength": len(data), "target": target})
    blob.extend(data)
    return len(gltf["bufferViews"]) - 1

total = 0
children = []
for name in sorted(groups):
    is_printed = name.startswith("RR1-")
    board = name[3:] in BOARDS
    # Printed parts: fine enough for round horn pockets to read as round. Bought parts: coarser.
    lin, ang, grid = (0.12, 0.3, 0.05) if is_printed else ((0.5, 0.6, 0.6) if board else (0.25, 0.45, 0.25))
    T = np.concatenate([tessellate(s, lin, ang) for s in groups[name]])
    P, N, I = index_mesh(to_gltf(T), grid * 0.001)
    vp, vn, vi = add_view(P.tobytes(), 34962), add_view(N.tobytes(), 34962), add_view(I.tobytes(), 34963)
    a0 = len(gltf["accessors"])
    gltf["accessors"] += [
        {"bufferView": vp, "componentType": 5126, "count": len(P), "type": "VEC3", "min": P.min(0).tolist(), "max": P.max(0).tolist()},
        {"bufferView": vn, "componentType": 5126, "count": len(N), "type": "VEC3"},
        {"bufferView": vi, "componentType": 5125, "count": len(I), "type": "SCALAR"},
    ]
    gltf["meshes"].append({"name": name, "primitives": [{"attributes": {"POSITION": a0, "NORMAL": a0 + 1}, "indices": a0 + 2,
                                                          "material": 0 if is_printed else 1}]})
    gltf["nodes"].append({"name": name, "mesh": len(gltf["meshes"]) - 1})
    children.append(len(gltf["nodes"]) - 1)
    total += len(I) // 3
    mn, mx = P.min(0) * 1000, P.max(0) * 1000
    print(f"{name:28s} {len(groups[name]):4d} solids {len(I)//3:7d} tris  x {mn[0]:5.0f}..{mx[0]:5.0f}  y(up) {mn[1]:5.0f}..{mx[1]:5.0f}  z(fwd) {mn[2]:5.0f}..{mx[2]:5.0f}")

gltf["nodes"].append({"name": "RoadRunnerMini", "children": children})
gltf["scenes"][0]["nodes"] = [len(gltf["nodes"]) - 1]
gltf["buffers"].append({"byteLength": len(blob)})
js = __import__("json").dumps(gltf, separators=(",", ":")).encode()
js += b" " * ((4 - len(js) % 4) % 4)
while len(blob) % 4:
    blob.append(0)
with open(OUT, "wb") as fh:
    fh.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(blob)))
    fh.write(struct.pack("<II", len(js), 0x4E4F534A)); fh.write(js)
    fh.write(struct.pack("<II", len(blob), 0x004E4942)); fh.write(blob)
print(f"{len(children)} meshes, {total} triangles, {os.path.getsize(OUT)/1e6:.1f} MB -> {OUT}")
