import { defineCollection, reference } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

// One file per project in src/content/projects/. The Markdown body is the project summary.
const projects = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/projects" }),
  schema: z.object({
    name: z.string(),
    order: z.number(),
    short: z.string(),
    focus: z.array(z.string()),
    status: z.string(),
    started: z.string(), // "March 2024"
    licence: z.string().optional(),
    stack: z.string(),
    tagline: z.string(),
    art: z.string(), // drawing shown in the project box, and the poster while a model loads
    model: z.string().optional(), // path to a .glb under public/models/; enables the 3D viewer
    versions: z.array(
      z.object({
        v: z.string(),
        dates: z.string(), // "Mar 2024 – Nov 2024" or "Jan 2026 – present"
        text: z.string(),
      }),
    ),
    // Downloads shown on the project's Resources tab. `file` is a path under public/.
    resources: z
      .object({
        cad: z
          .array(
            z.object({
              label: z.string(), // "STEP assembly"
              file: z.string(), // "/downloads/orion/orion-v2-step.zip"
              format: z.string(), // "STEP · 22 parts"
              version: z.string().optional(), // which version the files belong to
              note: z.string().optional(),
            }),
          )
          .default([]),
        source: z.string().optional(), // repository URL; the Source code entry stays disabled until this is set
        guide: z.string().optional(), // path of the project's assembly guide page
        // Bill of materials: the bought parts, each with a link to buy it.
        bom: z
          .array(
            z.object({
              group: z.string().default("Electronics"), // rows are listed under their group, in file order
              item: z.string(), // "Raspberry Pi Camera Module 3"
              qty: z.number().optional(), // how many one lamp needs
              detail: z.string().optional(), // the option to pick on the shop page, or where the part is used
              url: z.url().optional(), // buy link; common parts (screws, cables) go without one
            }),
          )
          .default([]),
      })
      .default({ cad: [], bom: [] }),
  }),
});

// Every dated entry: articles, papers, releases, milestones, updates.
// Folder per project is only for tidiness; the `project` field is what links them.
const posts = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/posts" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    type: z.enum(["milestone", "release", "paper", "article", "update"]),
    project: reference("projects"),
    summary: z.string().optional(),
    source: z.string().optional(), // e.g. "Preprint · 9 pages · PDF and code"
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

// Learn: lessons that each answer one question about a project, with interactive explainers.
// One folder per project (src/content/learn/orion/); the file name is the lesson's URL.
const lessons = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/learn" }),
  schema: z.object({
    title: z.string(), // the question the lesson answers: "How does Orion move?"
    project: reference("projects"),
    order: z.number(),
    summary: z.string(), // one or two sentences for the lesson list
    covers: z.array(z.string()).default([]), // a few short phrases shown on the lesson's card
    status: z.enum(["ready", "planned"]).default("ready"), // planned lessons are listed but can't be opened yet
  }),
});

// The shared glossary behind <Term>: one file per idea, written once and used by every project's lessons.
const concepts = defineCollection({
  loader: glob({ pattern: "*.md", base: "./src/content/concepts" }),
  schema: z.object({
    term: z.string(),
    short: z.string(), // one plain sentence
  }),
});

export const collections = { projects, posts, lessons, concepts };
