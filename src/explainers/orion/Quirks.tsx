import { useState } from "react";
import "../kit/kit.css";

// Quirks and what they change (docs/motion-architecture.md "Quirks"; curiosity.rs, remarks.rs).
const CURIOSITY = {
  shy: { gestures: 2, apart: "2 min", same: "4 min", objects: "1 glance in 4" },
  normal: { gestures: 3, apart: "1 min", same: "2 min", objects: "1 glance in 3" },
  nosy: { gestures: 5, apart: "30 s", same: "1 min", objects: "1 glance in 2" },
};
const CHATTINESS = {
  reserved: { apart: "20 min", perHour: 2, style: "very short remarks" },
  normal: { apart: "10 min", perHour: 4, style: "short remarks" },
  chatty: { apart: "5 min", perHour: 6, style: "remarks that can add a playful thought" },
};
type Cur = keyof typeof CURIOSITY;
type Chat = keyof typeof CHATTINESS;

/** Each lamp is born with two quirks. Unbox a few and compare. */
export default function Quirks() {
  const [cur, setCur] = useState<Cur>("nosy");
  const [chat, setChat] = useState<Chat>("reserved");
  const [unboxed, setUnboxed] = useState(1);
  // Like the gateway: a lamp without quirks gets a random outer value for each.
  const unbox = () => {
    setCur(Math.random() < 0.5 ? "shy" : "nosy");
    setChat(Math.random() < 0.5 ? "reserved" : "chatty");
    setUnboxed(unboxed + 1);
  };
  const c = CURIOSITY[cur];
  const h = CHATTINESS[chat];
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <button type="button" className="lx-btn is-primary" onClick={unbox}>Unbox a new Orion</button>
          <span className="lx-note">Lamp #{unboxed}</span>
        </div>
        <div className="lx-row">
          <span className="lx-label">Curiosity</span>
          {(Object.keys(CURIOSITY) as Cur[]).map((k) => <button key={k} type="button" className="lx-btn" aria-pressed={cur === k} onClick={() => setCur(k)}>{k}</button>)}
        </div>
        <div className="lx-row">
          <span className="lx-label">Chattiness</span>
          {(Object.keys(CHATTINESS) as Chat[]).map((k) => <button key={k} type="button" className="lx-btn" aria-pressed={chat === k} onClick={() => setChat(k)}>{k}</button>)}
        </div>
        <table className="lx-table">
          <tbody>
            <tr><th>Curious gestures in 10 min</th><td>{c.gestures}, at least {c.apart} apart</td></tr>
            <tr><th>Before the same thing again</th><td>{c.same}</td></tr>
            <tr><th>Idle glances at objects</th><td>{c.objects}</td></tr>
            <tr><th>Remarks (Lively)</th><td>{h.perHour} an hour, {h.apart} apart</td></tr>
            <tr><th>How it talks</th><td>{h.style}</td></tr>
          </tbody>
        </table>
        <p className="lx-card"><b>A {cur}, {chat} lamp</b>{cur === "nosy" ? "Looks at everything new, often." : cur === "shy" ? "Notices things, but rarely makes a move." : "Takes an interest now and then."} {chat === "chatty" ? "Happy to chat." : chat === "reserved" ? "Says little, and keeps it short." : "Speaks up now and then."}</p>
      </div>
      <figcaption className="lx-caption">A new Orion gets a random outer value for each quirk (shy or nosy, reserved or chatty), so no two are quite alike. The reply model is told the quirks too, so the words match the movement.</figcaption>
    </figure>
  );
}
