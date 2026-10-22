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
  guide: "/projects/orion/assembly/"
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
      detail: "Pack of 6; Orion uses 5"
      url: "https://www.aliexpress.com/item/1005009034555581.html"
    - item: "Servo power supply"
      detail: "Choose 6 V 5 A, UK plug"
      url: "https://www.aliexpress.com/item/1005012289452896.html"
    # Cables and power. Rows marked todo still need the exact product and link from the build.
    - group: "Cables and power"
      item: "Raspberry Pi 5 power supply"
      detail: "USB-C, for the Pi only"
      todo: true
    - group: "Cables and power"
      item: "Servo board power lead"
      detail: "From the 6 V supply to the servo board"
      todo: true
    - group: "Cables and power"
      item: "USB cable, servo board to Pi"
      todo: true
    - group: "Cables and power"
      item: "USB cable, microphone array to Pi"
      detail: "Thin cable (about 4.5 mm); it bends tightly inside the base"
      todo: true
    - group: "Cables and power"
      item: "LED ring wires"
      detail: "3 wires: 5 V, ground and data (GPIO12)"
      todo: true
    - group: "Cables and power"
      item: "Speaker wires"
      todo: true
    - group: "Cables and power"
      item: "Cable ties, 2.5 mm wide"
      qty: 2
      detail: "Strain relief for the two power leads"
    # Screws, inserts and dowels. Counts come from the CAD and cover one lamp, without spares.
    - group: "Screws, inserts and dowels"
      item: "M3 heat-set inserts, 4 mm long"
      qty: 40
      detail: "Base shell 14, yaw carrier 4, rear panels 8, shoulder housing 6, head shell 8"
    - group: "Screws, inserts and dowels"
      item: "M3 × 4 button-head screws"
      qty: 20
      detail: "Yaw horn adapter 4, shoulder horns 8, elbow horns 8"
    - group: "Screws, inserts and dowels"
      item: "M3 button-head screws for the wrist horns"
      qty: 8
      detail: "Longer than M3 × 4 because the wrist fork is wider; length to confirm"
      todo: true
    - group: "Screws, inserts and dowels"
      item: "M3 × 5 button-head screws"
      qty: 4
      detail: "Neck horn to the pitch fork"
    - group: "Screws, inserts and dowels"
      item: "M3 × 6 button-head screws"
      qty: 28
      detail: "Bottom cover 6, tray 4, yaw retainer 4, shoulder 6, head cartridge 4, front cassette 4"
    - group: "Screws, inserts and dowels"
      item: "M3 × 8 button-head screws"
      qty: 12
      detail: "Yaw carrier 4, rear panels 8"
    - group: "Screws, inserts and dowels"
      item: "M3 × 20 screws"
      qty: 16
      detail: "Arm seams: lower arm 12, upper arm 4"
    - group: "Screws, inserts and dowels"
      item: "Dowel pins, 3 mm × 6 mm"
      qty: 8
      detail: "4 per arm, to line up the two halves"
    - group: "Screws, inserts and dowels"
      item: "M2 × 4 pan-head screws"
      qty: 10
      detail: "Camera 4, LED ring retainer 3, microphone 3"
    - group: "Screws, inserts and dowels"
      item: "M2 × 6 pan-head screws"
      qty: 24
      detail: "Elbow and wrist servos 12, yaw servo 4, servo board 4, neck servo retainer 4"
    - group: "Screws, inserts and dowels"
      item: "M2 × 10 pan-head screws"
      qty: 2
      detail: "Shoulder servo"
    - group: "Screws, inserts and dowels"
      item: "M2.5 × 4 screws"
      qty: 4
      detail: "Raspberry Pi 5"
    - group: "Screws, inserts and dowels"
      item: "M2.5 × 6 screws"
      qty: 4
      detail: "Speaker"
    - group: "Screws, inserts and dowels"
      item: "M2 insulating washers, 0.5 mm thick"
      qty: 3
      detail: "Under the microphone board screws"
    - group: "Screws, inserts and dowels"
      item: "Thin removable adhesive tabs"
      qty: 18
      detail: "3 per decorative joint cap"
---

Orion is a home robot in the form of a desk lamp, built to assist and interact in a warm, playful, expressive way. Its onboard computer runs microphone processing, wake detection, speech recognition, speech synthesis and the motion runtime.
