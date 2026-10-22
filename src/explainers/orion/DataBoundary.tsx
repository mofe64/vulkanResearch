import { useState } from "react";
import FlowMap, { type FlowNode } from "../kit/FlowMap";
import "../kit/kit.css";

const NODES: FlowNode[] = [
  { id: "audio", x: 100, y: 60, label: "Your voice", sub: "audio" },
  { id: "text", x: 100, y: 120, label: "Your words", sub: "text" },
  { id: "image", x: 100, y: 180, label: "Camera images" },
  { id: "memory", x: 100, y: 240, label: "Conversation history" },
  { id: "codex", x: 480, y: 120, label: "Codex", sub: "writes replies", w: 120 },
];
const INFO: Record<string, string> = {
  audio: "Never leaves the lamp. Speech recognition runs on the Pi and passes on only the text. A cancelled or rejected recording is thrown away.",
  text: "The transcript of what you said goes to Codex, which needs it to write a reply.",
  image: "Kept in the Pi's memory only. One snapshot goes to Codex when you ask Orion to look at something; otherwise none.",
  memory: "Stored on the Pi. Orion's behaviour journal records what it did, but never camera pixels or microphone audio.",
  codex: "The online language model. It only ever sees text, plus a photo when you explicitly ask Orion to look.",
};

/** What stays on the lamp and what goes online. */
export default function DataBoundary() {
  const [pick, setPick] = useState("audio");
  return (
    <figure className="lx">
      <div className="lx-body">
        <FlowMap
          nodes={NODES}
          edges={[{ from: "text", to: "codex" }, { from: "image", to: "codex", via: [300, 180] }]}
          groups={[{ label: "On the lamp", x: 12, y: 18, w: 190, h: 260 }, { label: "Online", x: 400, y: 76, w: 160, h: 88, kind: "online" }]}
          height={290}
          active={[pick]}
          onSelect={setPick}
          label="Which data stays on Orion and which goes online"
        />
        <p className="lx-card">{INFO[pick]}</p>
      </div>
      <figcaption className="lx-caption">Tap a box. The dashed line from the camera is used only when you ask Orion to look.</figcaption>
    </figure>
  );
}
