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
type Chat = keyof typeof CHATTY;
const AFTER_TALK = 5 * 60;
const REPLY_WINDOW = 45;

// The rules in the order remarks.rs checks them. Each reason a remark is refused belongs to one rule.
const RULES = [
  { label: "Orion isn't busy", reasons: ["busy"] },
  { label: "Nobody asked it to be quiet", reasons: ["asked_quiet"] },
  { label: "It hasn't already spoken to this person this visit", reasons: ["once_per_visit"] },
  { label: "The person isn't concentrating", reasons: ["focus"] },
  { label: "It isn't quiet hours (22:00 to 07:00)", reasons: ["night"] },
  { label: "No conversation in the last 5 minutes", reasons: ["after_conversation"] },
  { label: "Long enough since the last remark", reasons: ["spacing", "ignored"] },
  { label: "It hasn't talked about this kind of thing lately", reasons: ["cooldown"] },
  { label: "It has remarks left this hour", reasons: ["hourly_limit"] },
  { label: "A new thing is worth mentioning", reasons: ["ordinary_object", "seen_today"] },
];

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
interface Env { busy: boolean; focus: boolean; hour: number; chat: Chat; object: string }
interface Check { event: Event; refused: string | null }
type Line = { t: number; text: string; ok?: boolean };

const fresh = (): State => ({ t: 0, spoken: [], byEvent: {}, seenToday: [], ignored: 0, awaiting: null, lastTalk: null, quietUntil: 0, spokeThisVisit: false, cared: [] });
const DEFAULT_ENV: Env = { busy: false, focus: false, hour: 14, chat: "normal", object: OBJECTS[0] };
const fmt = (x: number) => `${Math.floor(x / 3600)}:${String(Math.floor((x % 3600) / 60)).padStart(2, "0")}`;

function refusal(e: Event, st: State, env: Env): string | null {
  const now = st.t;
  const hourly = st.spoken.filter((x) => now - x < 3600).length;
  const spacing = CHATTY[env.chat].spacing * 2 ** st.ignored;
  if (env.busy) return "busy";
  if (now < st.quietUntil) return "asked_quiet";
  if (ABOUT_PERSON.includes(e) && st.spokeThisVisit) return "once_per_visit";
  if (CARE.includes(e) && st.cared.includes(e)) return "once_per_visit";
  if (env.focus && !CARE.includes(e)) return "focus";
  if (env.hour >= 22 || env.hour < 7) return "night";
  if (st.lastTalk !== null && now - st.lastTalk < AFTER_TALK) return "after_conversation";
  if (st.spoken.length && now - st.spoken.at(-1)! < spacing) return st.ignored ? "ignored" : "spacing";
  const last = st.byEvent[e];
  if (last !== undefined && now - last < EVENTS.find((x) => x.id === e)!.cooldown) return "cooldown";
  if (hourly >= CHATTY[env.chat].perHour) return "hourly_limit";
  if (e === "object" && ORDINARY.includes(env.object)) return "ordinary_object";
  if (e === "object" && st.seenToday.includes(env.object)) return "seen_today";
  return null;
}

// Each step is a pure function of the state, so a scenario can run several of them in a row.
function happen(st: State, env: Env, e: Event): { st: State; line: Line; check: Check } {
  const why = refusal(e, st, env);
  const label = EVENTS.find((x) => x.id === e)!.label + (e === "object" ? ` (${env.object})` : "");
  if (why) return { st, line: { t: st.t, text: `${label}: stays quiet. ${REASONS[why]}`, ok: false }, check: { event: e, refused: why } };
  const next: State = {
    ...st,
    spoken: [...st.spoken, st.t],
    byEvent: { ...st.byEvent, [e]: st.t },
    seenToday: e === "object" ? [...st.seenToday, env.object] : st.seenToday,
    spokeThisVisit: st.spokeThisVisit || ABOUT_PERSON.includes(e),
    cared: CARE.includes(e) ? [...st.cared, e] : st.cared,
    awaiting: st.t,
  };
  return { st: next, line: { t: st.t, text: `${label}: Orion says something.`, ok: true }, check: { event: e, refused: null } };
}
// Time passes; a remark nobody answered within 45 s counts as ignored (at most twice).
function pass(st: State, seconds: number): State {
  const t = st.t + seconds;
  const unanswered = st.awaiting !== null && t - st.awaiting >= REPLY_WINDOW;
  return { ...st, t, awaiting: unanswered ? null : st.awaiting, ignored: unanswered ? Math.min(2, st.ignored + 1) : st.ignored };
}
// Talking with Orion counts as engagement: the back-off resets, and it has now spoken with this person.
const talk = (st: State): State => ({ ...st, ignored: 0, awaiting: null, lastTalk: st.t, spokeThisVisit: true });
// Everyone leaving is also time passing, so an unanswered remark still counts as ignored.
const newVisit = (st: State): State => ({ ...pass(st, 11 * 60), spokeThisVisit: false, cared: [] });

type Step = { happen: Event } | { wait: number };
const SCENARIOS: { id: string; label: string; env: Partial<Env>; steps: Step[]; explain: string }[] = [
  {
    id: "twice",
    label: "Two arrivals in a row",
    env: {},
    steps: [{ happen: "arrived" }, { wait: 2 * 60 }, { happen: "arrived" }],
    explain: "The first arrival gets a hello. Two minutes later it's still the same visit, so Orion stays quiet: it greets each visit once.",
  },
  {
    id: "ignored",
    label: "Ignored remark backs off",
    env: { object: "guitar" },
    steps: [{ happen: "object" }, { wait: 60 }, { wait: 10 * 60 }, { happen: "looking" }],
    explain: "Nobody answered the remark about the guitar within 45 seconds, so the usual 10-minute gap doubles to 20. At 11 minutes Orion still holds back. A reply would have reset the gap.",
  },
  {
    id: "focus",
    label: "Concentrating at the desk",
    env: { focus: true, object: "umbrella" },
    steps: [{ happen: "break" }, { wait: 60 }, { happen: "object" }],
    explain: "Someone who has looked away from Orion for a long time is concentrating. A care reminder, like the break nudge, still gets through. A comment about a new umbrella doesn't.",
  },
  {
    id: "night",
    label: "Quiet hours at 23:00",
    env: { hour: 23 },
    steps: [{ happen: "arrived" }],
    explain: "Between 22:00 and 07:00 Orion makes no remarks, apart from a goodnight. Owners can move these hours in Settings.",
  },
];

/** Things happen around a Lively Orion; it decides, with its own rules, whether to say something. */
export default function RemarkRules() {
  const [s, setS] = useState<State>(fresh);
  const [env, setEnv] = useState<Env>(DEFAULT_ENV);
  const [log, setLog] = useState<Line[]>([]);
  const [check, setCheck] = useState<Check | null>(null);
  const [scenario, setScenario] = useState<string | null>(null);
  const set = (patch: Partial<Env>) => { setEnv({ ...env, ...patch }); setScenario(null); };

  const run = (id: string) => {
    const sc = SCENARIOS.find((x) => x.id === id)!;
    const e2 = { ...DEFAULT_ENV, ...sc.env };
    let st = fresh();
    const lines: Line[] = [];
    let last: Check | null = null;
    for (const step of sc.steps) {
      if ("wait" in step) st = pass(st, step.wait);
      else {
        const r = happen(st, e2, step.happen);
        st = r.st; lines.unshift(r.line); last = r.check;
      }
    }
    setEnv(e2); setS(st); setLog(lines.slice(0, 5)); setCheck(last); setScenario(id);
  };
  const doEvent = (e: Event) => {
    const r = happen(s, env, e);
    setS(r.st); setLog([r.line, ...log].slice(0, 5)); setCheck(r.check); setScenario(null);
  };
  const step = (f: (st: State) => State) => { setS(f(s)); setScenario(null); };

  const failed = check?.refused ? RULES.findIndex((r) => r.reasons.includes(check.refused!)) : -1;
  const sc = SCENARIOS.find((x) => x.id === scenario);

  return (
    <figure className="lx">
      <div className="lx-body">
        <div className="lx-row">
          <span className="lx-label">Try</span>
          {SCENARIOS.map((x) => <button key={x.id} type="button" className="lx-btn" aria-pressed={scenario === x.id} onClick={() => run(x.id)}>{x.label}</button>)}
        </div>

        <div className="lx-rulebox">
          <ol className="lx-rules" aria-label="Orion's remark rules, in the order it checks them">
            {RULES.map((r, k) => {
              let state = "is-idle";
              if (check) {
                if (r.reasons[0] === "ordinary_object" && check.event !== "object") state = "is-na";
                else if (failed < 0 || k < failed) state = "is-pass";
                else if (k === failed) state = "is-fail";
                else state = "is-skip";
              }
              const mark = state === "is-pass" ? "✓" : state === "is-fail" ? "✕" : state === "is-na" ? "–" : "";
              return <li key={r.label} className={state}><span aria-hidden="true">{mark}</span><span>{r.label}</span></li>;
            })}
          </ol>
          <div className="lx-ruleside">
            {check ? (
              <p className="lx-card" aria-live="polite">
                <b>{check.refused ? "Orion stays quiet" : "Orion says something"}</b>
                {check.refused ? REASONS[check.refused] : "Every rule passed."}
              </p>
            ) : (
              <p className="lx-note">Pick an example above, or make something happen below. The rules light up in the order Orion checks them, and stop at the first one that says no.</p>
            )}
            {sc && <p className="lx-note">{sc.explain}</p>}
          </div>
        </div>

        <ul className="lx-log" aria-label="What happened">
          {log.map((l, k) => <li key={`${l.t}-${k}-${l.text}`} className={k === 0 ? "is-new" : ""} style={l.ok ? { color: "var(--heat)" } : undefined}>+{fmt(l.t)} · {l.text}</li>)}
        </ul>

        <details className="lx-more">
          <summary>Set it up yourself</summary>
          <div className="lx-body lx-more-body">
            <div className="lx-row">
              <span className="lx-label">Something happens</span>
              {EVENTS.map((e) => <button key={e.id} type="button" className="lx-btn" onClick={() => doEvent(e.id)}>{e.label}</button>)}
              <select className="lx-btn" value={env.object} onChange={(e) => set({ object: e.target.value })} aria-label="Which new thing">
                {OBJECTS.map((o) => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div className="lx-row">
              <span className="lx-label">Time</span>
              {[1, 10, 60].map((m) => <button key={m} type="button" className="lx-btn" onClick={() => step((st) => pass(st, m * 60))}>+{m} min</button>)}
              <button type="button" className="lx-btn" onClick={() => step(newVisit)}>Everyone leaves for 11 min</button>
              <button type="button" className="lx-btn" onClick={() => step(talk)}>Have a conversation</button>
              <button type="button" className="lx-btn" onClick={() => step((st) => ({ ...st, quietUntil: st.t + 3600 }))}>“Be quiet for a while”</button>
            </div>
            <div className="lx-row">
              <label className="lx-switch"><input type="checkbox" checked={env.busy} onChange={(e) => set({ busy: e.target.checked })} />Orion is busy</label>
              <label className="lx-switch"><input type="checkbox" checked={env.focus} onChange={(e) => set({ focus: e.target.checked })} />Person is concentrating</label>
              <span className="lx-label" style={{ marginLeft: "auto" }}>Chattiness</span>
              <select className="lx-btn" value={env.chat} onChange={(e) => set({ chat: e.target.value as Chat })} aria-label="Chattiness quirk">
                {Object.keys(CHATTY).map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <label className="lx-slider"><span>Time of day</span><input type="range" min={0} max={23} step={1} value={env.hour} onChange={(e) => set({ hour: Number(e.target.value) })} /><output>{String(env.hour).padStart(2, "0")}:00</output></label>
            <div className="lx-stats">
              <span>Clock <b>+{fmt(s.t)}</b></span>
              <span>Remarks this hour <b>{s.spoken.filter((x) => s.t - x < 3600).length} of {CHATTY[env.chat].perHour}</b></span>
              <span>Ignored in a row <b>{s.ignored}</b></span>
              <button type="button" className="lx-btn" onClick={() => { setS(fresh()); setEnv(DEFAULT_ENV); setLog([]); setCheck(null); setScenario(null); }}>Start over</button>
            </div>
          </div>
        </details>
      </div>
      <figcaption className="lx-caption">Orion's own rules for a Lively lamp, checked in the same order. Owners can adjust most of these numbers in Settings.</figcaption>
    </figure>
  );
}
