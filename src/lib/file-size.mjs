// Size of a file under public/, read at build time so a download's listed size can't drift from the file.
// Plain JS so the Node built-ins don't need @types/node in the Astro type check.
import fs from "node:fs";
import path from "node:path";

/** "/downloads/x.zip" -> "463 KB" / "4.7 MB", or null when the file isn't there. */
export function publicFileSize(href) {
  const file = path.join(process.cwd(), "public", href);
  if (!fs.existsSync(file)) return null;
  const bytes = fs.statSync(file).size;
  return bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.round(bytes / 1e3)} KB`;
}
