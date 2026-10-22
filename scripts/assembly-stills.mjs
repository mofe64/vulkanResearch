// Render a still picture of every assembly-guide step from the 3D view, for narrow screens and printing.
// With `npm run dev` (or `npm run preview`) running:
//   node scripts/assembly-stills.mjs http://localhost:4321/projects/orion/assembly/ public/guides/orion
// Writes step-01.webp, step-02.webp, ... (1200 × 900).
import { spawn } from "node:child_process";
import fs from "node:fs";

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) throw new Error("usage: assembly-stills.mjs <guide url> <output dir>");
fs.mkdirSync(outDir, { recursive: true });

const CHROME = process.env.CHROME ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const chrome = spawn(CHROME, [
  "--headless=new", "--remote-debugging-port=9335", "--hide-scrollbars", "--user-data-dir=/tmp/cdp-stills-" + process.pid, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  try { target = (await (await fetch("http://127.0.0.1:9335/json")).json()).find((t) => t.type === "page"); } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result?.value;

try {
  await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
  await send("Page.navigate", { url: url + (url.includes("?") ? "&" : "?") + "capture" });
  for (let i = 0; i < 200 && !(await ev("!!window.assemblyViewer && !!window.guideSteps")); i++) await sleep(100);
  const count = await ev("window.guideSteps.length");
  if (!count) throw new Error("the guide page did not expose its steps; is it the assembly guide URL?");
  for (let n = 0; n < count; n++) {
    await ev(`window.assemblyViewer.setStep(window.guideSteps[${n}])`);
    await sleep(120);
    const { data } = await send("Page.captureScreenshot", { format: "webp", quality: 82, clip: { x: 0, y: 0, width: 1200, height: 900, scale: 1 } });
    const file = `${outDir}/step-${String(n + 1).padStart(2, "0")}.webp`;
    fs.writeFileSync(file, Buffer.from(data, "base64"));
    console.log(file);
  }
} finally {
  ws.close();
  chrome.kill();
}
