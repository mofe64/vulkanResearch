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
    text: "Redesigned body: a 200 × 230 mm base, straight two-piece arms with 150 mm and 131 mm spans, and a 125 mm head carrying the camera, speaker and LED ring."
resources:
  cad:
    - label: "Printable parts"
      file: "/downloads/orion/orion-v2.1-stl.zip"
      format: "STL · 26 files · Orion V2.1"
      note: "Digitally checked for fit and slicing; not yet confirmed on a physical build."
  # source: ""  # set the repository URL once the code has a home; until then the entry shows as coming soon
---

Orion is a home robot in the form of a desk lamp, built to assist and interact in a warm, playful, expressive way. Its onboard computer runs microphone processing, wake detection, speech recognition, speech synthesis and the motion runtime.
