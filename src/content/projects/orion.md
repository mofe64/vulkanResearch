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
      note: "Every printed part of Orion V2.1, ready for your slicer. Print notes are in the README inside the zip."
  source: "https://github.com/mofe64/orion"
  bom:
    - item: "Raspberry Pi 5"
      detail: "8GB"
      url: "https://thepihut.com/products/raspberry-pi-5?variant=42531604955331"
    - item: "Active Cooler for Raspberry Pi 5"
      url: "https://thepihut.com/products/active-cooler-for-raspberry-pi-5"
    - item: "Serial Bus Servo Driver Board"
      url: "https://thepihut.com/products/serial-bus-servo-driver-board?variant=43300989665475"
    - item: "ReSpeaker XMOS XVF3800 4-mic array"
      url: "https://thepihut.com/products/respeaker-xmos-xvf3800-ai-powered-4-mic-array-for-clear-voice-even-in-noise?variant=54948690231681"
    - item: "Raspberry Pi Camera Module 3"
      detail: "Wide-angle"
      url: "https://thepihut.com/products/raspberry-pi-camera-module-3?variant=42305752072387"
    - item: "Camera cable joiner / extender, 15-pin to 15-pin"
      url: "https://thepihut.com/products/camera-cable-joiner-extender-for-raspberry-pi?variant=13548468273214"
    - item: "Camera adapter cable for Raspberry Pi 5"
      detail: "500 mm"
      url: "https://thepihut.com/products/camera-adapter-cable-for-raspberry-pi-5?variant=42531560849603"
    - item: "Mono enclosed speaker, 3 W 4 Ω"
      url: "https://thepihut.com/products/mono-enclosed-speaker-3w-4-ohm?variant=31955927249"
    - item: "NeoPixel Ring, 24 RGBW LEDs"
      detail: "Cool white 6000K"
      url: "https://thepihut.com/products/neopixel-ring-24-x-5050-rgbw-leds-w-integrated-drivers-cool-white-6000k?variant=27740166865"
    - item: "Feetech STS3215 serial bus servos"
      detail: "Pack of 6"
      url: "https://www.aliexpress.com/item/1005009034555581.html"
    - item: "Power supply"
      detail: "Choose 6 V 5 A, UK plug"
      url: "https://www.aliexpress.com/item/1005012289452896.html"
---

Orion is a home robot in the form of a desk lamp, built to assist and interact in a warm, playful, expressive way. Its onboard computer runs microphone processing, wake detection, speech recognition, speech synthesis and the motion runtime.
