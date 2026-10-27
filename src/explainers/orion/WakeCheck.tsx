import { useState } from "react";
import "../kit/kit.css";

// Illustrations, not recordings: how each kind of sound tends to fare at each stage.
const EXAMPLES = [
  { said: "Hey Orion", first: true, heard: "hey orion" },
  { said: "Hey, Ryan!", first: true, heard: "hey ryan" },
  { said: "…the Orion constellation…", first: true, heard: "the orion constellation" },
  { said: "Pass the onion", first: false, heard: "" },
  { said: "TV chatter", first: false, heard: "" },
];

/** The second check is plain text matching, done here exactly: does the start of the transcript say “hey orion”? */
const matches = (text: string) => /\bhey\W+orion\b/.test(text.toLowerCase());

/** Two checks before Orion reacts: a fast sound-pattern detector, then speech recognition on the first words. */
export default function WakeCheck() {
  const [i, setI] = useState(0);
  const [typed, setTyped] = useState("");
  const ex = EXAMPLES[i];
  const second = ex.first ? matches(ex.heard) : null;
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Someone says</span>
          {EXAMPLES.map((e, k) => (
            <button key={e.said} type="button" className="lx-btn" aria-pressed={i === k} onClick={() => setI(k)}>{e.said}</button>
          ))}
        </div>
        <ol className="lx-checks">
          <li className={ex.first ? "is-pass" : "is-fail"}>
            <b>1. Sounds like it?</b> openWakeWord scores every 20 ms of sound against “Hey Orion”. Fast and always
            on, but it can be fooled. <span>{ex.first ? "Maybe: check further" : "No: ignored"}</span>
          </li>
          <li className={second === null ? "is-skip" : second ? "is-pass" : "is-fail"}>
            <b>2. Says it?</b> Qwen writes down the last few seconds and Orion checks the first words for the phrase.
            {second !== null && <> Heard: <q>{ex.heard}</q>.</>}
            <span>{second === null ? "Not needed" : second ? "Yes: Orion wakes" : "No: thrown away"}</span>
          </li>
        </ol>
        <label className="lx-slider" style={{ gridTemplateColumns: "auto minmax(0,1fr) auto" }}>
          <span>Try the text check</span>
          <input type="text" className="lx-btn" value={typed} placeholder="type what was heard" onChange={(e) => setTyped(e.target.value)} />
          <output>{typed ? (matches(typed) ? "wakes" : "ignored") : ""}</output>
        </label>
      </div>
      <figcaption className="lx-caption">Nothing lights up or plays until the second check passes, so false alarms stay invisible. The examples are illustrations.</figcaption>
    </figure>
  );
}
