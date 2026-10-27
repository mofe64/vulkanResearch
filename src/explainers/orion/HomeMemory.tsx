import { useState } from "react";
import "../kit/kit.css";

// Home memory's "things to come back to" (docs/configuration.md, "Home memory").
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Mon", "Tue"];
const EVENT_DAY = 3; // the interview is on Thursday
const WINDOW = 3; // offered on the day and up to 3 days after
const MAX_OFFERS = 3; // a note given 3 times without a question stops

/** Tell Orion about something coming up, and watch when it can bring it back. */
export default function HomeMemory() {
  const [told, setTold] = useState(false);
  const [day, setDay] = useState(0);
  const [offers, setOffers] = useState(0);
  const [asked, setAsked] = useState(false);
  const inWindow = told && day >= EVENT_DAY && day <= EVENT_DAY + WINDOW;
  const live = inWindow && !asked && offers < MAX_OFFERS;
  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <button type="button" className="lx-btn is-primary" disabled={told} onClick={() => { setTold(true); setDay(0); }}>Tell Orion: “I've got a job interview on Thursday”</button>
          <button type="button" className="lx-btn" onClick={() => { setTold(false); setOffers(0); setAsked(false); setDay(0); }}>Start over</button>
        </div>
        <div className="lx-days">
          {DAYS.map((d, i) => (
            <button key={i} type="button" className={`lx-day ${i === day ? "is-on" : ""} ${told && i >= EVENT_DAY && i <= EVENT_DAY + WINDOW ? "is-window" : ""}`} onClick={() => setDay(i)}>
              {d}{told && i === EVENT_DAY ? " ★" : ""}
            </button>
          ))}
        </div>
        <p className="lx-card">
          {!told
            ? "Nothing saved yet. Orion saves a short note on its own when you mention an event; it doesn't ask first."
            : asked
              ? "Orion asked how it went, so the note is done and won't come up again."
              : offers >= MAX_OFFERS
                ? "The note came up 3 times without Orion asking about it, so it stops."
                : live
                  ? "Today the note goes along with your requests, and with a welcome when you arrive. Orion might ask how the interview went."
                  : day < EVENT_DAY
                    ? "Saved: “job interview, Thursday”. It stays out of conversations until the day."
                    : "The window has passed; the note no longer comes up."}
        </p>
        <div className="lx-row">
          <button type="button" className="lx-btn" disabled={!live} onClick={() => setOffers(offers + 1)}>You talk to Orion today</button>
          <button type="button" className="lx-btn" disabled={!live} onClick={() => setAsked(true)}>Orion asks “How did the interview go?”</button>
          <span className="lx-note">Times it came up: {offers}</span>
        </div>
      </div>
      <figcaption className="lx-caption">Home memory lives on the lamp, and Studio can show or delete every part of it. Orion also notes habits (things that happened at least twice) and one sentence for each of the last 30 days.</figcaption>
    </figure>
  );
}
