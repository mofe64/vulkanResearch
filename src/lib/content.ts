import { getCollection, type CollectionEntry } from "astro:content";

export type Project = CollectionEntry<"projects">;
export type Post = CollectionEntry<"posts">;
export type PostType = Post["data"]["type"];

export const TYPE_LABEL: Record<PostType, string> = {
  milestone: "Milestone",
  release: "Release",
  paper: "Paper",
  article: "Article",
  update: "Update",
};

// [fill, border] for the timeline dots and legend.
export const TYPE_DOT: Record<PostType, [string, string]> = {
  milestone: ["var(--heat)", "var(--heat)"],
  release: ["var(--ink)", "var(--ink)"],
  paper: ["var(--link)", "var(--link)"],
  article: ["#fff", "var(--ink)"],
  update: ["#fff", "#999"],
};

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export const fmtDate = (d: Date) => `${MON[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;

export const postUrl = (p: Post) => `/log/${p.id}/`;
export const projectUrl = (id: string) => `/projects/${id}/`;

export async function getProjects() {
  return (await getCollection("projects")).sort((a, b) => a.data.order - b.data.order);
}

/** Start date of a version from its "3 Jul 2026 – …" or "Jul 2026 – …" range. */
export function versionStart(dates: string) {
  const parts = dates.split("–")[0].trim().split(" ");
  const [d, m, y] = parts.length === 3 ? parts : ["1", ...parts];
  return new Date(Date.UTC(+y, MON.indexOf(m), +d));
}

/** Most recent sign of life: the latest post or the latest version start. */
export async function lastActivity(project: Project) {
  const posts = await getPosts((p) => p.data.project.id === project.id);
  const dates = [...posts.map((p) => p.data.date), ...project.data.versions.map((v) => versionStart(v.dates))];
  return new Date(Math.max(...dates.map((d) => d.valueOf())));
}

/** All projects, most recently active first. */
export async function getProjectsByActivity() {
  const projects = await getProjects();
  const withDates = await Promise.all(projects.map(async (p) => ({ project: p, last: await lastActivity(p) })));
  return withDates.sort((a, b) => b.last.valueOf() - a.last.valueOf());
}

/** Published posts, newest first. Drafts show in `astro dev` but never in a build. */
export async function getPosts(filter?: (p: Post) => boolean) {
  const all = await getCollection("posts", (p) => import.meta.env.DEV || !p.data.draft);
  return all.filter(filter ?? (() => true)).sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/* ---------- Timeline geometry ----------
   The axis is fitted to one project: from its first version (or post) to the end of the current month.
   Short projects get a tick per month, long ones a tick per year. */
const now = new Date();
const monthOf = (d: Date) => d.getUTCFullYear() * 12 + d.getUTCMonth() + (d.getUTCDate() - 1) / 31;
/** "Sep 2026" or "30 Sep 2026" -> months since year 0 (fractional when a day is given). */
const parseMonth = (s: string, end = false) => {
  const parts = s.trim().split(" ");
  const [d, m, y] = parts.length === 3 ? parts : [null, ...parts];
  const month = +y! * 12 + MON.indexOf(m!);
  if (d) return month + (+d - (end ? 0 : 1)) / 31;
  return end ? month + 1 : month;
};

export function projectTimeline(project: Project, posts: Post[]) {
  const vs = project.data.versions;
  const nowM = monthOf(now);
  const starts = vs.map((v) => parseMonth(v.dates.split("–")[0]));
  const lo = Math.floor(Math.min(...starts, ...posts.map((p) => monthOf(p.data.date))));
  const hi = Math.ceil(nowM + 0.5); // at least half a month of room after today for the current label
  const span = Math.max(1, hi - lo);
  const pct = (n: number) => ((Math.max(0, Math.min(span, n - lo)) / span) * 100).toFixed(2) + "%";

  const monthly = span <= 24;
  const ticks: { label: string; left: string }[] = [];
  for (let m = lo; m < hi; m++) {
    const month = m % 12, year = Math.floor(m / 12);
    if (monthly) ticks.push({ label: month === 0 || m === lo ? `${MON[month]} ${year}` : MON[month], left: pct(m) });
    else if (month === 0 || m === lo) ticks.push({ label: String(year), left: pct(m) });
  }

  const bars = vs.map((v, i) => {
    const [a, b] = v.dates.split("–");
    const start = parseMonth(a);
    const end = b.trim() === "present" ? nowM : parseMonth(b, true);
    const current = i === vs.length - 1;
    return { label: current ? `${v.v} · now` : v.v, dates: v.dates, left: pct(start), width: `calc(${pct(end)} - ${pct(start)} - 3px)`, current };
  });

  const dots = posts.map((p) => ({
    left: pct(monthOf(p.data.date)),
    fill: TYPE_DOT[p.data.type][0],
    border: TYPE_DOT[p.data.type][1],
    title: `${fmtDate(p.data.date)} · ${p.data.title}`,
    href: postUrl(p),
    type: p.data.type,
  }));

  // Grid lines every month (or year), drawn by the track's background.
  const gridStep = `${((monthly ? 1 : 12) / span) * 100}%`;
  return { ticks, bars, dots, today: pct(nowM), gridStep };
}
