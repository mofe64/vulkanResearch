---
name: "Orion"
order: 1
short: "Expressive desk-lamp robot"
focus: ["Robotics", "Embedded AI"]
status: "Active"
started: "July 2026"
stack: "Raspberry Pi 5, ReSpeaker 2-Mics HAT, Rustpotter, Qwen ASR, Piper TTS"
# licence: ""  # TODO: add the licence before publishing
tagline: "A home robot in the form of a desk lamp that listens, speaks and moves with character."
art: "/art/orion-v2-poster.png"  # shown while the 3D model loads, or without WebGL
model: "/models/orion-v2.glb"
versions:
  - v: "v1"
    dates: "3 Jul 2026 – 29 Sep 2026"
    text: "First build on the open LeLamp reference design: servo-driven lamp arm, Raspberry Pi 5 and ReSpeaker microphones running the first voice and motion pipeline."
  - v: "v2"
    dates: "30 Sep 2026 – present"
    text: "Redesigned body: a 230 × 210 mm base, 150 mm and 111 mm arm spans, and a 140 mm head carrying the camera, speaker and LED ring. 25 printed PLA pieces."
resources:
  cad:
    - label: "CAD parts"
      file: "/downloads/orion/orion-v2-step.zip"
      format: "STEP · 22 parts in assembly position"
      version: "v2"
      note: "For editing or remixing in any CAD tool."
    - label: "Printable parts"
      file: "/downloads/orion/orion-v2-stl.zip"
      format: "STL · one file per part"
      version: "v2"
      note: "For any slicer."
    - label: "Print plates"
      file: "/downloads/orion/orion-v2-print-plates.zip"
      format: "Bambu Studio 3MF · 8 plates"
      version: "v2"
      note: "Sliced for a Bambu Lab A1, 0.4 mm nozzle, PLA."
  # source: ""  # set the repository URL once the code has a home; until then the entry shows as coming soon
---

Orion is a home robot in the form of a desk lamp, built to assist and interact in a warm, playful, expressive way. Its onboard computer runs microphone processing, wake detection, speech recognition, speech synthesis and the motion runtime.
