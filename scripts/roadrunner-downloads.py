"""Package Road Runner Mini's printable files for the project page's Resources tab.

usage: python3 scripts/roadrunner-downloads.py ~/dev/roadrunner/roadrunner_mini/v1

Writes public/downloads/roadrunner-mini/roadrunner-mini-v1-s72-stl.zip (the 18 parts, renamed with the part numbers
the assembly guide uses, the two test coupons and a README) and ...-plates-3mf.zip (the 11 Bambu Studio plates).
"""
import os, sys, zipfile

REPO = os.path.expanduser(sys.argv[1])
CAD = os.path.join(REPO, "cad", "biped_v02")
OUT = os.path.join(os.path.dirname(__file__), "..", "public", "downloads", "roadrunner-mini")
STATE = "s72"

# Source file -> name in the zip. The numbers match the 3D model and the assembly guide.
PARTS = {
    "chassis_lower.stl": "RR1-01-chassis-lower.stl",
    "chassis_upper.stl": "RR1-02-chassis-upper.stl",
    "tray.stl": "RR1-03-tray.stl",
    "lid.stl": "RR1-04-lid.stl",
    "upper_deck.stl": "RR1-05-upper-deck.stl",
    "imu_plate.stl": "RR1-06-imu-plate.stl",
    "pitch_bracket.stl": "RR1-07-pitch-bracket.stl",
    "head.stl": "RR1-08-head.stl",
    "hub_L.stl": "RR1-09l-hub-L.stl",
    "hub_R.stl": "RR1-09r-hub-R.stl",
    "lower_front_plate_L.stl": "RR1-10l-lower-front-L.stl",
    "lower_front_plate_R.stl": "RR1-10r-lower-front-R.stl",
    "lower_rear_L.stl": "RR1-11l-lower-rear-L.stl",
    "lower_rear_R.stl": "RR1-11r-lower-rear-R.stl",
    "upper_front_L.stl": "RR1-12l-upper-front-L.stl",
    "upper_front_R.stl": "RR1-12r-upper-front-R.stl",
    "upper_rear_L.stl": "RR1-13l-upper-rear-L.stl",
    "upper_rear_R.stl": "RR1-13r-upper-rear-R.stl",
}
COUPONS = ["coupon_all.stl", "coupon_horn_gauge.stl"]

README = """Road Runner Mini v1 printable parts (STL, millimetres, CAD state S72)
MIT licence. Source: https://github.com/mofe64/roadRunnerMiniV1
Assembly guide: https://vulkanresearch.com/projects/roadrunner-mini/assembly/

WHAT'S IN HERE
18 parts, one of each. The number after RR1- is the part number used in the
assembly guide and its 3D view. L and R are the robot's own left and right.

  01 chassis lower     02 chassis upper     03 tray             04 lid
  05 upper deck        06 IMU plate         07 pitch bracket    08 head
  09 wheel hubs        10 lower front plates
  11 lower rear links  12 upper front links 13 upper rear links

coupons/ holds two small test prints. Print them first (see below).

If you use a Bambu printer, the 3MF plate files (also on the project page)
already hold these parts in the right orientation with every setting saved.

PRINTER AND MATERIAL
Designed and tested on a Bambu Lab A1, 0.4 mm nozzle, Bambu PLA Basic,
0.20 mm layers. The full set uses about 540 g of PLA.

SETTINGS PER PART
Part                     Orientation                      Walls Infill  Supports              Brim
Head (08)                Upright                          4     30% gyr Tree, build plate only Auto
Pitch bracket (07)       On its long side                 5     40% gyr Tree, build plate only 5 mm outer
Upper links (12, 13)     Outer face down                  4     100%    None                  Auto
Hubs (09)                Flange face down                 4     100%    None                  Auto
Lower front plates (10)  Inner face down                  4     100%    None                  Auto
Lower rear links (11)    As laid out; one arm sits 39 mm  4     100%    Tree, everywhere      Auto
                         above the bed
Chassis lower (01)       Floor down                       4     30% gyr None                  5 mm outer
Chassis upper (02)       On its walls and posts           4     30% gyr Tree, build plate only 5 mm outer + inner
Upper deck (05)          Bottom face down                 4     30% gyr None                  Auto
Tray (03)                Floor down (open box)            4     30% gyr Tree, build plate only Auto
Lid (04)                 Top face down                    4     30% gyr Tree, build plate only Auto
IMU plate (06)           Flat side down, posts up         4     100%    None                  Auto

The leg parts are solid (100% infill) because they carry the whole robot
through small screw bosses.

WHY THE ORIENTATIONS MATTER
- Pitch bracket: print it on its long side so the layers run along its thin
  2 mm arms. Printed upright, the arms snap along a layer line.
- Lower rear links: the supports under the raised arm are needed.
- Chassis upper: after printing, clear the brim out of the corner-post holes.
- The chassis is two parts so each one has a large flat face on the bed.

TEST COUPONS: PRINT AND CHECK THESE FIRST
Print coupon_all.stl and coupon_horn_gauge.stl with the same printer,
filament and settings as the parts. Each check tells you whether a fit in the
real parts will work:

  M2 screw in the 1.8 mm hole     cuts its own thread; needs a screwdriver
  M2 screw in the 2.5 mm hole     passes through freely
  M3 screw in the 3.5 mm hole     passes through freely
  M3 heat-set insert, 4.0 mm hole goes in only with heat
  Servo horn in the 20.2 mm pocket stays in upside down, falls out when tapped
  8 mm tab in the slots           slides in without force
  STS3215 servo in the notch      goes in and moves freely side to side

If a check fails, tune the printer (flow, shrinkage or hole compensation)
before printing the real parts.

SUGGESTED PRINT ORDER
1. The coupons.
2. Head and pitch bracket: check that a servo, a horn and the OAK-D Lite fit.
3. The legs: hubs, upper links, lower front plates, lower rear links.
4. Chassis lower and upper, upper deck, IMU plate.
5. Tray and lid.

AFTER PRINTING
Fit the 20 M3 x 5 x 4 heat-set inserts before assembly (step 2 of the guide):
chassis upper 12, upper deck 4, hubs 4. Each must sit flush and straight.
Don't drill out the small M2 holes: they are undersized on purpose so the
screws can cut a thread.
"""

os.makedirs(OUT, exist_ok=True)
stl_zip = os.path.join(OUT, f"roadrunner-mini-v1-{STATE}-stl.zip")
root = f"roadrunner-mini-v1-{STATE}-stl"
with zipfile.ZipFile(stl_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.writestr(f"{root}/README.txt", README)
    for src, dst in PARTS.items():
        z.write(os.path.join(CAD, "stl", src), f"{root}/{dst}")
    for c in COUPONS:
        z.write(os.path.join(CAD, "coupon", c), f"{root}/coupons/{c}")
print(stl_zip, os.path.getsize(stl_zip))

plates_zip = os.path.join(OUT, f"roadrunner-mini-v1-{STATE}-plates-3mf.zip")
root = f"roadrunner-mini-v1-{STATE}-plates"
plates = sorted(f for f in os.listdir(os.path.join(CAD, "plates")) if f.endswith(".3mf"))
assert len(plates) == 11, plates
with zipfile.ZipFile(plates_zip, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
    z.writestr(f"{root}/README.txt",
               "Road Runner Mini v1 print plates (Bambu Studio 3MF, CAD state S72). MIT licence.\n\n"
               "Open each file with File > Open Project, check the object count matches the plate name, and print\n"
               "without changing the settings: orientation, walls, infill, supports and brim are saved in the file.\n"
               "The single STL files and the test coupons are in the STL zip on the project page.\n")
    for f in plates:
        z.write(os.path.join(CAD, "plates", f), f"{root}/{f}")
print(plates_zip, os.path.getsize(plates_zip))
