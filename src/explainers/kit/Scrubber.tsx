interface Props {
  t: number;
  duration: number;
  playing: boolean;
  onPlay: () => void;
  onPause: () => void;
  onSeek: (t: number) => void;
  /** Named moments shown as ticks on the track, such as keyframe arrivals. */
  marks?: { t: number; label?: string }[];
}

/** Play, pause and drag through time. Every moving explainer has one, so anything that moves can be stopped. */
export default function Scrubber({ t, duration, playing, onPlay, onPause, onSeek, marks = [] }: Props) {
  return (
    <div className="lx-scrub">
      <button type="button" className="lx-play" onClick={playing ? onPause : onPlay} aria-label={playing ? "Pause" : "Play"}>
        {playing ? "❚❚" : "▶"}
      </button>
      <div className="lx-track">
        {marks.map((m, i) => (
          <span key={i} className="lx-mark" style={{ left: `${(m.t / duration) * 100}%` }} title={m.label} />
        ))}
        <input
          type="range"
          min={0}
          max={duration}
          step={0.001}
          value={t}
          aria-label="Time"
          onChange={(e) => {
            onPause();
            onSeek(Number(e.target.value));
          }}
        />
      </div>
      <span className="lx-time">{t.toFixed(2)} s</span>
    </div>
  );
}
