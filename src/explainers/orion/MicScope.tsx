import { useEffect, useRef, useState } from "react";
import "../kit/kit.css";

/**
 * Sound as numbers: the live waveform from the reader's microphone (only after they press the button; nothing is
 * recorded or sent anywhere) or from one of Orion's own cue sounds.
 */
export default function MicScope() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [source, setSource] = useState<"none" | "mic" | "cue">("none");
  const [rate, setRate] = useState<number | null>(null);
  const [values, setValues] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const audio = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);

  const stop = () => {
    audio.current?.stop();
    audio.current = null;
    setSource("none");
  };
  useEffect(() => stop, []);

  const start = async (kind: "mic" | "cue") => {
    stop();
    setError(null);
    try {
      const ctx = new AudioContext();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      let node: AudioNode;
      let cleanup = () => {};
      if (kind === "mic") {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        node = ctx.createMediaStreamSource(stream);
        cleanup = () => stream.getTracks().forEach((t) => t.stop());
      } else {
        const data = await (await fetch("/learn/orion/wake_chirp.wav")).arrayBuffer();
        const buffer = await ctx.decodeAudioData(data);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        src.loop = true;
        src.connect(ctx.destination);
        src.start();
        node = src;
        cleanup = () => src.stop();
      }
      node.connect(analyser);
      setRate(ctx.sampleRate);
      const buf = new Float32Array(analyser.fftSize);
      let raf = 0;
      let frames = 0;
      const draw = () => {
        analyser.getFloatTimeDomainData(buf);
        const c = canvas.current;
        if (c) {
          const g = c.getContext("2d")!;
          const w = (c.width = c.clientWidth * devicePixelRatio);
          const h = (c.height = c.clientHeight * devicePixelRatio);
          g.clearRect(0, 0, w, h);
          g.strokeStyle = "#e5e5e5";
          g.beginPath(); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke();
          g.strokeStyle = "#d0592a";
          g.lineWidth = 1.5 * devicePixelRatio;
          g.beginPath();
          for (let i = 0; i < buf.length; i++) {
            const x = (i / buf.length) * w;
            const y = h / 2 - buf[i] * h * 1.8;
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.stroke();
        }
        if (++frames % 15 === 0) setValues(Array.from(buf.slice(0, 6), (v) => Math.round(v * 10000) / 10000));
        raf = requestAnimationFrame(draw);
      };
      draw();
      audio.current = { ctx, stop: () => { cancelAnimationFrame(raf); cleanup(); ctx.close(); } };
      setSource(kind);
    } catch {
      setError("The microphone isn't available. Try Orion's sound instead.");
    }
  };

  return (
    <figure className="lx">
      <div className="lx-body">
        <canvas ref={canvas} className="lx-scope" aria-label="Sound wave" />
        <div className="lx-row">
          <button type="button" className="lx-btn is-primary" onClick={() => (source === "mic" ? stop() : start("mic"))}>{source === "mic" ? "Stop microphone" : "Use my microphone"}</button>
          <button type="button" className="lx-btn" onClick={() => (source === "cue" ? stop() : start("cue"))}>{source === "cue" ? "Stop sound" : "Play Orion's wake sound"}</button>
        </div>
        {error && <p className="lx-error">{error}</p>}
        {rate && source !== "none" && (
          <div className="lx-stats">
            <span>Numbers per second <b>{rate.toLocaleString()}</b></span>
            <span>The latest few <b>{values.join("  ")}</b></span>
          </div>
        )}
      </div>
      <figcaption className="lx-caption">Speak or hum and watch the line. Each point on it is one number: how far the air pressure is pushed from normal at that instant. Your audio stays in this page.</figcaption>
    </figure>
  );
}
