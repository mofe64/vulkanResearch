// Capture the 3D viewer on the project page as a 2x PNG poster, right after the model appears.
import { spawn } from "node:child_process";
import fs from "node:fs";
const [url, out] = process.argv.slice(2);
const chrome = spawn("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", [
  "--headless=new", "--remote-debugging-port=9334", "--hide-scrollbars", "--user-data-dir=/tmp/cdp-poster-" + process.pid, "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let target;
for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch("http://127.0.0.1:9334/json")).json()).find((t) => t.type === "page"); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (e) => (await send("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
await send("Emulation.setDeviceMetricsOverride", { width: 1240, height: 900, deviceScaleFactor: 2, mobile: false });
await send("Page.navigate", { url });
for (let i = 0; i < 100 && !(await ev("!!document.querySelector('robot-viewer.is-3d')")); i++) await sleep(50);
await ev("document.querySelector('robot-viewer .hint').style.display='none'; document.querySelector('robot-viewer').style.border='0'");
await sleep(650); // canvas fade-in
const r = await ev("(()=>{const b=document.querySelector('robot-viewer').getBoundingClientRect();return {x:b.x,y:b.y,width:b.width,height:b.height}})()");
const { data } = await send("Page.captureScreenshot", { format: "png", clip: { ...r, scale: 1 } });
fs.writeFileSync(out, Buffer.from(data, "base64"));
console.log("poster", r, out);
ws.close(); chrome.kill();
