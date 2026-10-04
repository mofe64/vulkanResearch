// One-off: build animated hero copies of the drawings into webapp/src/assets/hero/.
// Every animation is gated on an ancestor with [data-playing], runs a finite number of times,
// and ends in the drawn pose, so the slideshow can wait for "one cycle" with element.getAnimations().
import fs from "node:fs";
import { pathKeyframes } from "./path-keyframes.mjs";
const SRC = new URL("../../vulkan-research-hero-illustration/project", import.meta.url).pathname;
const OUT = new URL("../src/assets/hero", import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const read = (f) => fs.readFileSync(`${SRC}/${f}`, "utf8").replace(/>\s+</g, "><"); // whitespace between tags only
const must = (s, what) => { if (s == null) throw new Error("anchor not found: " + what); return s; };
function replaceOnce(s, re, to, what) {
  if (!re.test(s)) throw new Error("anchor not found: " + what);
  return s.replace(re, to);
}
/** Cut an exact element (by a unique prefix) out of the markup, returning [rest, element]. */
function cut(s, startsWith, what) {
  const i = must(s.indexOf(startsWith) >= 0 ? s.indexOf(startsWith) : null, what);
  const tag = startsWith.match(/^<(\w+)/)[1];
  const close = `</${tag}>`;
  const j = s.indexOf(close, i) + close.length;
  return [s.slice(0, i) + s.slice(j), s.slice(i, j)];
}
const addStyle = (s, css) => s.replace("</defs>", `</defs><style>${css.replace(/\s*\n\s*/g, "")}</style>`);

/* ---------- forge drawings: hammer strike x3, sparks on each impact ---------- */
function forge(file, p, dur) {
  let s = read(file);
  s = replaceOnce(s, /<g>(\s*<path d="M699 466)/, `<g class="${p}-hammer">$1`, "hammer");
  s = replaceOnce(s, /(<g transform="translate\(692 496\)" stroke="#D0592A">\s*)<g>/, `$1<g class="${p}-sparks">`, "sparks");
  return addStyle(s, `
    .${p}-hammer{transform-box:view-box;transform-origin:880px 415px}
    [data-playing] .${p}-hammer{animation:${p}-strike ${dur}s cubic-bezier(.45,0,.55,1) 3 both}
    [data-playing] .${p}-sparks{animation:${p}-sparks ${dur}s linear 3 both}
    @keyframes ${p}-strike{0%{transform:rotate(0)}48%{transform:rotate(15deg)}62%{transform:rotate(0);animation-timing-function:ease-out}68%{transform:rotate(1.5deg)}74%,100%{transform:rotate(0)}}
    @keyframes ${p}-sparks{0%,60%{opacity:0}63%{opacity:1}80%{opacity:.85}94%,100%{opacity:0}}`);
}
fs.writeFileSync(`${OUT}/smith.svg`, forge("vulkan-hero-smith-gripper.svg", "hs", 1.9));

/* ---------- Orion: lower the cube 40px and lift it again ----------
   Two-link IK (shoulder 280,316; elbow 352,208; wrist 432,252):
   wrist 40px lower needs shoulder +11.0deg, elbow +8.5deg; wrist -19.5deg keeps the gripper level. */
{
  let s = read("spot-orion.svg");
  let cable, sh1, sh2, sh3;
  [s, cable] = cut(s, '<path d="M300 344C326 340 330 300 314 290"', "cable");
  [s, sh1] = cut(s, '<circle cx="280" cy="316" r="17"', "shoulder 1");
  [s, sh2] = cut(s, '<circle cx="280" cy="316" r="6.5"', "shoulder 2");
  [s, sh3] = cut(s, '<circle cx="280" cy="316" r="1.9"', "shoulder 3");
  const upper = '<path d="M292.5 324.3';
  const fore = '<path d="M346.7 217.6';
  const wrist = '<circle cx="432" cy="252" r="10"';
  const fingersEnd = 'L440 304" fill="none"></path>';
  must(s.includes(upper) && s.includes(fore) && s.includes(wrist) && s.includes(fingersEnd) || null, "orion anchors");
  s = s.replace(upper, `${cable}<g class="ho-shoulder">${upper}`)
       .replace(fore, `<g class="ho-elbow">${fore}`)
       .replace(wrist, `<g class="ho-wrist">${wrist}`)
       .replace(fingersEnd, `${fingersEnd}</g></g></g>`);
  // shoulder joint drawn on top of the upper arm, outside the moving groups (it sits on the pivot)
  s = s.replace(`<g class="ho-elbow">`, `${sh1}${sh2}${sh3}<g class="ho-elbow">`);
  s = addStyle(s, `
    .ho-shoulder,.ho-elbow,.ho-wrist{transform-box:view-box}
    .ho-shoulder{transform-origin:280px 316px}.ho-elbow{transform-origin:352px 208px}.ho-wrist{transform-origin:432px 252px}
    [data-playing] .ho-shoulder{animation:ho-s 6s ease-in-out 1 both}
    [data-playing] .ho-elbow{animation:ho-e 6s ease-in-out 1 both}
    [data-playing] .ho-wrist{animation:ho-w 6s ease-in-out 1 both}
    @keyframes ho-s{0%,12%{transform:rotate(0)}42%,58%{transform:rotate(11deg)}88%,100%{transform:rotate(0)}}
    @keyframes ho-e{0%,12%{transform:rotate(0)}42%,58%{transform:rotate(8.5deg)}88%,100%{transform:rotate(0)}}
    @keyframes ho-w{0%,12%{transform:rotate(0)}42%,58%{transform:rotate(-19.5deg)}88%,100%{transform:rotate(0)}}`);
  fs.writeFileSync(`${OUT}/orion.svg`, s);
}

/* ---------- Kestrel: detection box locks on, bird looks around, LED blinks ---------- */
{
  let s = read("spot-kestrel.svg");
  const head = '<circle cx="262" cy="214" r="14"';
  const headEnd = '<path d="M264 219C264 223 263 226 261 230" stroke-width="1.3"></path>';
  const box = '<path d="M238 188L222 188';
  const boxEnd = '<rect x="222" y="178" width="34" height="6" fill="#2266BB" stroke="none"></rect>';
  const led = '<circle cx="326" cy="333" r="2"';
  must([head, headEnd, box, boxEnd, led].every((a) => s.includes(a)) || null, "kestrel anchors");
  s = s.replace(head, `<g class="hk-head">${head}`).replace(headEnd, `${headEnd}</g>`)
       .replace(box, `<g class="hk-box">${box}`).replace(boxEnd, `${boxEnd}</g>`)
       .replace(led, `<circle class="hk-led" cx="326" cy="333" r="2"`);
  s = addStyle(s, `
    .hk-head,.hk-box{transform-box:view-box}
    .hk-head{transform-origin:262px 228px}.hk-box{transform-origin:263px 282px}
    [data-playing] .hk-head{animation:hk-head 5.5s ease-in-out 1 both}
    [data-playing] .hk-box{animation:hk-box 5.5s ease-out 1 both}
    [data-playing] .hk-led{animation:hk-led 5.5s steps(1) 1 both}
    @keyframes hk-head{0%,10%{transform:rotate(0)}22%,38%{transform:rotate(-14deg)}50%,64%{transform:rotate(9deg)}76%,100%{transform:rotate(0)}}
    @keyframes hk-box{0%,6%{opacity:0;transform:scale(1.35)}24%{opacity:1;transform:scale(1)}30%{opacity:.35}36%{opacity:1}42%{opacity:.35}48%,100%{opacity:1;transform:scale(1)}}
    @keyframes hk-led{0%{opacity:1}24%{opacity:.15}30%{opacity:1}36%{opacity:.15}42%{opacity:1}100%{opacity:1}}`);
  fs.writeFileSync(`${OUT}/kestrel.svg`, s);
}

/* ---------- Wren: drive along the pencil line ---------- */
{
  let s = read("spot-wren.svg");
  const line = "M140 342C210 334 238 252 300 232C360 212 382 282 440 252C470 236 482 182 470 130";
  must(s.includes(`d="${line}"`) || null, "wren line");
  const bot = '<g transform="translate(332 224) rotate(-8)">';
  const botEnd = '<circle cx="-34" cy="0" r="3.2" fill="#D0592A" stroke="none"></circle></g>';
  must(s.includes(bot) && s.includes(botEnd) || null, "wren bot");
  s = s.replace(bot, `<g class="hw-path"><g class="hw-bot" transform="translate(332 224) rotate(-8)">`)
       .replace(botEnd, `<circle class="hw-led" cx="-34" cy="0" r="3.2" fill="#D0592A" stroke="none"></circle></g></g>`);
  s = addStyle(s, `
    .hw-path{transform-box:view-box;transform-origin:0 0}
    [data-playing] .hw-path{animation:hw-drive 6.5s linear 1 both}
    [data-playing] .hw-bot{transform:none}
    [data-playing] .hw-led{animation:hw-led .65s steps(1) 10 both}
    @keyframes hw-drive{${pathKeyframes(line, { from: 6, to: 94 })}}
    @keyframes hw-led{0%{opacity:1}50%{opacity:.2}}`);
  fs.writeFileSync(`${OUT}/wren.svg`, s);
}

/* ---------- Field Notes: the pencil draws the step response ---------- */
{
  let s = read("spot-fieldnotes.svg");
  const curve = "M326 320C346 320 350 262 372 262C390 262 392 276 405 271C420 266 430 270 456 268";
  const curveTag = `<path d="${curve}" stroke="#2266BB" stroke-width="1.5">`;
  must(s.includes(curveTag) || null, "fieldnotes curve");
  s = s.replace(curveTag, `<path class="hf-curve" pathLength="1" d="${curve}" stroke="#2266BB" stroke-width="1.5">`);
  const pencil = '<g transform="translate(420 400) rotate(-28)">';
  must(s.includes(pencil) || null, "pencil");
  // pencil tip is at local (-22,0) -> drawn at (400.57, 410.33)
  const r = (-28 * Math.PI) / 180;
  const tip = [420 + -22 * Math.cos(r), 400 + -22 * Math.sin(r)].map((n) => +n.toFixed(2));
  // close the pencil's group: it is the last <g> inside the main group
  const lastG = s.lastIndexOf("</g></g>");
  s = s.slice(0, lastG) + "</g></g></g>" + s.slice(lastG + "</g></g>".length);
  s = s.replace(pencil, `<g class="hf-pen"><g class="hf-pen-in" transform="translate(420 400) rotate(-28)">`);

  // Path for the tip: rest -> curve start, along the curve, back to rest. Measure segment lengths
  // so the drawing of the curve and the pencil stay in sync.
  const cubic = (p0, p1, p2, p3, t) => p0.map((_, i) => (1 - t) ** 3 * p0[i] + 3 * (1 - t) ** 2 * t * p1[i] + 3 * (1 - t) * t * t * p2[i] + t ** 3 * p3[i]);
  const segs = [[[326, 320], [346, 320], [350, 262], [372, 262]], [[372, 262], [390, 262], [392, 276], [405, 271]], [[405, 271], [420, 266], [430, 270], [456, 268]]];
  let curveLen = 0;
  for (const sg of segs) { let prev = sg[0]; for (let k = 1; k <= 400; k++) { const q = cubic(...sg, k / 400); curveLen += Math.hypot(q[0] - prev[0], q[1] - prev[1]); prev = q; } }
  const toStart = Math.hypot(326 - tip[0], 320 - tip[1]);
  const back = Math.hypot(tip[0] - 456, tip[1] - 268);
  const total = toStart + curveLen + back;
  const a = ((toStart / total) * 100).toFixed(2), b = (((toStart + curveLen) / total) * 100).toFixed(2);
  const penPath = `M${tip[0]} ${tip[1]}L326 320${curve.slice("M326 320".length)}L${tip[0]} ${tip[1]}`;
  s = addStyle(s, `
    [data-playing] .hf-pen{offset-path:path("${penPath}");offset-rotate:0deg;animation:hf-pen 6.5s 1 both}
    [data-playing] .hf-pen-in{transform:rotate(-28deg) translate(22px,0)}
    [data-playing] .hf-curve{stroke-dasharray:1 1;animation:hf-draw 6.5s 1 both}
    @keyframes hf-pen{0%,8%{offset-distance:0%;animation-timing-function:ease-in-out}22%{offset-distance:${a}%;animation-timing-function:linear}68%{offset-distance:${b}%;animation-timing-function:ease-in-out}88%,100%{offset-distance:100%}}
    @keyframes hf-draw{0%,22%{stroke-dashoffset:1;animation-timing-function:linear}68%,100%{stroke-dashoffset:0}}`);
  fs.writeFileSync(`${OUT}/fieldnotes.svg`, s);
  console.log("fieldnotes curve", curveLen.toFixed(1), "split", a, b);
}
console.log(fs.readdirSync(OUT));
