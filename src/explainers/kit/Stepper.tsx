interface Props {
  step: number;
  count: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onGo: (n: number) => void;
  labels?: string[];
}

/** Play/pause plus back and forward buttons for an explainer that runs in steps. */
export default function Stepper({ step, count, playing, onPlay, onPause, onGo, labels }: Props) {
  return (
    <div className="lx-row">
      <button type="button" className="lx-play" onClick={playing ? onPause : onPlay} aria-label={playing ? "Pause" : "Play"}>{playing ? "❚❚" : "▶"}</button>
      <button type="button" className="lx-btn" onClick={() => { onPause(); onGo(step - 1); }} disabled={step === 0}>← Back</button>
      <button type="button" className="lx-btn" onClick={() => { onPause(); onGo(step + 1); }} disabled={step === count - 1}>Next →</button>
      <span className="lx-time" style={{ marginLeft: "auto" }}>{labels?.[step] ?? `Step ${step + 1} of ${count}`}</span>
    </div>
  );
}
