// Remark plugin: lets notes copied from Obsidian render on the site without editing.
//
//   > [!hint] Title          ->  <aside class="callout callout-hint"> with a title line
//   ![[episode.m4a]]          ->  <audio controls> pointing at /audio/episode.m4a
//   ![[diagram.png|Alt]]      ->  <img src="/media/diagram.png" alt="Alt">
//   [[Other note|label]]      ->  link to the post whose title is "Other note" (plain text if none)
//   ```mermaid ... ```        ->  <pre class="mermaid">, drawn in the browser by Mermaid
//
// Audio files go in public/audio/, images in public/media/, using the same file names as in the vault.
import fs from "node:fs";
import path from "node:path";

const POSTS_DIR = path.resolve("src/content/posts");
const AUDIO = new Set(["m4a", "mp3", "wav", "ogg", "aac", "flac"]);
const IMAGE = new Set(["png", "jpg", "jpeg", "gif", "webp", "svg", "avif"]);

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** title (lower-case) -> URL, read from post front matter. Cheap enough to rebuild per file. */
function postIndex() {
  const index = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.mdx?$/.test(entry.name)) {
        const head = fs.readFileSync(full, "utf8").slice(0, 2000);
        const title = head.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1];
        const id = path.relative(POSTS_DIR, full).replace(/\.mdx?$/, "").split(path.sep).join("/");
        const url = `/log/${id}/`;
        if (title) index.set(title.toLowerCase(), url);
        index.set(path.basename(id).toLowerCase(), url);
      }
    }
  };
  if (fs.existsSync(POSTS_DIR)) walk(POSTS_DIR);
  return index;
}

/** Split text nodes on ![[...]] and [[...]] and replace the matches with real nodes. */
function expandLinks(text, index) {
  const out = [];
  const re = /(!?)\[\[([^\]|#]+)(#[^\]|]*)?(?:\|([^\]]+))?\]\]/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    if (m.index > last) out.push({ type: "text", value: text.slice(last, m.index) });
    const [, bang, rawTarget, heading = "", alias] = m;
    const target = rawTarget.trim();
    const ext = target.split(".").pop().toLowerCase();
    if (bang && AUDIO.has(ext)) {
      const src = `/audio/${encodeURIComponent(target)}`;
      out.push({ type: "html", value: `<audio class="embed-audio" controls preload="none" src="${src}"><a href="${src}">Download the audio</a></audio>` });
    } else if (bang && IMAGE.has(ext)) {
      out.push({ type: "image", url: `/media/${encodeURIComponent(target)}`, alt: alias ?? "" });
    } else {
      const url = index.get(target.toLowerCase());
      const label = alias ?? target;
      if (url) {
        const anchor = heading ? "#" + heading.slice(1).trim().toLowerCase().replace(/[^\w]+/g, "-") : "";
        out.push({ type: "link", url: url + anchor, children: [{ type: "text", value: label }] });
      } else out.push({ type: "text", value: label });
    }
    last = m.index + m[0].length;
  }
  if (!out.length) return null;
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

function callout(node) {
  const first = node.children[0];
  const head = first?.type === "paragraph" ? first.children[0] : null;
  const m = head?.type === "text" && head.value.match(/^\[!(\w+)\][+-]?[ \t]*([^\n]*)\n?/);
  if (!m) return;
  const kind = m[1].toLowerCase();
  const title = m[2].trim() || kind[0].toUpperCase() + kind.slice(1);
  head.value = head.value.slice(m[0].length);
  if (!head.value) first.children.shift();
  if (!first.children.length) node.children.shift();
  node.children.unshift({
    type: "paragraph",
    data: { hProperties: { className: ["callout-title"] } },
    children: [{ type: "text", value: title }],
  });
  node.data = { hName: "aside", hProperties: { className: ["callout", `callout-${kind}`] } };
}

function walk(node, index) {
  if (node.type === "blockquote") callout(node);
  if (node.type === "code" && node.lang === "mermaid") {
    Object.assign(node, { type: "html", value: `<pre class="mermaid">${escapeHtml(node.value)}</pre>` });
    return;
  }
  if (!node.children) return;
  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    if (child.type === "text") {
      const parts = expandLinks(child.value, index);
      if (parts) {
        node.children.splice(i, 1, ...parts);
        i += parts.length - 1;
        continue;
      }
    }
    walk(child, index);
  }
}

export default function remarkObsidian() {
  return (tree) => walk(tree, postIndex());
}
