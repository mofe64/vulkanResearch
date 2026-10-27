import { useState } from "react";
import "../kit/kit.css";

// A port of Orion's remark admission (runtime/src/expression/remarks.rs) for a Lively lamp with the default owner
// rules (settings.rs): quiet 22:00 to 07:00, 4 remarks an hour, 10 min apart, 5 min after a conversation.
type Event = "arrived" | "looking" | "object" | "light" | "break";
const EVENTS: { id: Event; label: string; cooldown: number }[] = [
  { id: "arrived", label: "Someone comes into view", cooldown: 30 * 60 },
  { id: "looking", label: "Someone looks at Orion for a while", cooldown: 20 * 60 },
  { id: "object", label: "Something new appears on the desk", cooldown: 60 * 60 },
  { id: "light", label: "The desk is getting dark", cooldown: 3 * 3600 },
  { id: "break", label: "Someone has worked for 90 minutes", cooldown: 3600 },
];
const ABOUT_PERSON: Event[] = ["arrived", "looking"];
const CARE: Event[] = ["light", "break"];
const OBJECTS = ["umbrella", "guitar", "cup"];
const ORDINARY = ["laptop", "keyboard", "mouse", "cell phone", "tv", "chair", "dining table", "cup", "bottle", "remote", "couch", "bed", "potted plant", "book"];
const CHATTY = {
  reserved: { spacing: 20 * 60, perHour: 2 },
  normal: { spacing: 10 * 60, perHour: 4 },
  chatty: { spacing: 5 * 60, perHour: 6 },
};
const AFTER_TALK = 5 * 60;
const REPLY_WINDOW = 45;

const REASONS: Record<string, string> = {
  busy: "Orion is busy (talking, playing music or running a scene).",
  asked_quiet: "You asked it to be quiet for a while.",
  once_per_visit: "It already spoke with this person on this visit.",
  focus: "The person has been looking away for a long time: they're concentrating.",
  night: "It's quiet hours (22:00 to 07:00).",
  after_conversation: "A conversation ended less than 5 minutes ago.",
  spacing: "The last remark was too recent.",
  ignored: "The last remark was too recent, and the wait doubled because it was ignored.",
  cooldown: "It already spoke about this kind of thing recently.",
  hourly_limit: "It has used up this hour's remarks.",
  ordinary_object: "A cup is an everyday desk object: not news.",
  seen_today: "It already mentioned one of these today.",
};

interface State {
  t: number;
  spoken: number[];
  byEvent: Partial<Record<Event, number>>;
  seenToday: string[];
  ignored: number;
  awaiting: number | null;
  lastTalk: number | null;
  quietUntil: number;
  spokeThisVisit: boolean;
  cared: Event[];
}
const fresh = (): State => ({ t: 0, spoken: [], byEvent: {}, seenToday: [], ignored: 0, awaiting: null, lastTalk: null, quietUntil: 0, spokeThisVisit: false, cared: [] });

/** Things happen around a Lively Orion; it decides, with its own rules, whether to say something. */
export default function RemarkRules() {
  const [s, setS] = useState<State>(fresh);
  const [hour, setHour] = useState(14);
  const [busy, setBusy] = useState(false);
  const [focus, setFocus] = useState(false);
  const [chat, setChat] = useState<keyof typeof CHATTY>("normal");
  const [object, setObject] = useState(OBJECTS[0]);
  const [log, setLog] = useState<{ t: number; text: string; ok: boolean }[]>([]);

  const refusal = (e: Event, st: State): string | null => {
    const now = st.t;
    const hourly = st.spoken.filter((x) => now - x < 3600).length;
    const spacing = CHATTY[chat].spacing * 2 ** st.ignored;
    if (busy) return "busy";
    if (now < st.quietUntil) return "asked_quiet";
    if (ABOUT_PERSON.includes(e) && st.spokeThisVisit) return "once_per_visit";
    if (CARE.includes(e) && st.cared.includes(e)) return "once_per_visit";
    if (focus && !CARE.includes(e)) return "focus";
    if (hour >= 22 || hour < 7) return "night";
    if (st.lastTalk !== null && now - st.lastTalk < AFTER_TALK) return "after_conversation";
    if (st.spoken.length && now - st.spoken.at(-1)! < spacing) return st.ignored ? "ignored" : "spacing";
    const last = st.byEvent[e];
    if (last !== undefined && now - last < EVENTS.find((x) => x.id === e)!.cooldown) return "cooldown";
    if (hourly >= CHATTY[chat].perHour) return "hourly_limit";
    if (e === "object" && ORDINARY.includes(object)) return "ordinary_object";
    if (e === "object" && st.seenToday.includes(object)) return "seen_today";
    return null;
  };

  const happen = (e: Event) => {
    const why = refusal(e, s);
    const label = EVENTS.find((x) => x.id === e)!.label + (e === "object" ? ` (${object})` : "");
    if (why) {
      setLog([{ t: s.t, text: `${label}: stays quiet. ${REASONS[why]}`, ok: false }, ...log].slice(0, 5));
      return;
    }
    setS({
      ...s,
      spoken: [...s.spoken, s.t],
      byEvent: { ...s.byEvent, [e]: s.t },
      seenToday: e === "object" ? [...s.seenToday, object] : s.seenToday,
      spokeThisVisit: s.spokeThisVisit || ABOUT_PERSON.includes(e),
      cared: CARE.includes(e) ? [...s.cared, e] : s.cared,
      awaiting: s.t,
    });
    setLog([{ t: s.t, text: `${label}: Orion says something.`, ok: true }, ...log].slice(0, 5));
  };

  // Time passes; a remark nobody answered within 45 s counts as ignored (at most twice).
  const wait = (seconds: number) =>
    setS((st) => {
      const t = st.t + seconds;
      const unanswered = st.awaiting !== null && t - st.awaiting >= REPLY_WINDOW;
      return { ...st, t, awaiting: unanswered ? null : st.awaiting, ignored: unanswered ? Math.min(2, st.ignored + 1) : st.ignored };
    });
  // Talking with Orion counts as engagement: the back-off resets, and it has now spoken with this person.
  const talk = () => setS({ ...s, ignored: 0, awaiting: null, lastTalk: s.t, spokeThisVisit: true });
  const newVisit = () => setS({ ...s, t: s.t + 11 * 60, spokeThisVisit: false, cared: [] });
  const fmt = (x: number) => `${Math.floor(x / 3600)}:${String(Math.floor((x % 3600) / 60)).padStart(2, "0")}`;

  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Something happens</span>
          {EVENTS.map((e) => <button key={e.id} type="button" className="lx-btn" onClick={() => happen(e.id)}>{e.label}</button>)}
          <select className="lx-btn" value={object} onChange={(e) => setObject(e.target.value)} aria-label="Which new thing">
            {OBJECTS.map((o) => <option key={o}>{o}</option>)}
          </select>
        </div>
        <div className="lx-row">
          <span className="lx-label">Time</span>
          {[1, 10, 60].map((m) => <button key={m} type="button" className="lx-btn" onClick={() => wait(m * 60)}>+{m} min</button>)}
          <button type="button" className="lx-btn" onClick={newVisit}>Everyone leaves for 11 min</button>
          <button type="button" className="lx-btn" onClick={talk}>Have a conversation</button>
          <button type="button" className="lx-btn" onClick={() => setS({ ...s, quietUntil: s.t + 3600 })}>“Be quiet for a while”</button>
        </div>
        <div className="lx-row">
          <label className="lx-switch"><input type="checkbox" checked={busy} onChange={(e) => setBusy(e.target.checked)} />Orion is busy</label>
          <label className="lx-switch"><input type="checkbox" checked={focus} onChange={(e) => setFocus(e.target.checked)} />Person is concentrating</label>
          <span className="lx-label" style={{ marginLeft: "auto" }}>Chattiness</span>
          <select className="lx-btn" value={chat} onChange={(e) => setChat(e.target.value as keyof typeof CHATTY)} aria-label="Chattiness quirk">
            {Object.keys(CHATTY).map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <label className="lx-slider"><span>Time of day</span><input type="range" min={0} max={23} step={1} value={hour} onChange={(e) => setHour(Number(e.target.value))} /><output>{String(hour).padStart(2, "0")}:00</output></label>
        <div className="lx-stats">
          <span>Clock <b>+{fmt(s.t)}</b></span>
          <span>Remarks this hour <b>{s.spoken.filter((x) => s.t - x < 3600).length} of {CHATTY[chat].perHour}</b></span>
          <span>Ignored in a row <b>{s.ignored}</b></span>
          <button type="button" className="lx-btn" onClick={() => { setS(fresh()); setLog([]); }}>Start over</button>
        </div>
        <ul className="lx-log" aria-live="polite">
          {log.length === 0 && <li>Make something happen.</li>}
          {log.map((l, k) => <li key={`${l.t}-${k}-${l.text}`} className={k === 0 ? "is-new" : ""} style={l.ok ? { color: "var(--heat)" } : undefined}>{fmt(l.t)} · {l.text}</li>)}
        </ul>
      </div>
      <figcaption className="lx-caption">Orion's own rules for a Lively lamp, checked in the same order. Try two arrivals in a row, then ignore a remark and see the wait grow. Owners can adjust most of these numbers in Settings.</figcaption>
    </figure>
  );
}
