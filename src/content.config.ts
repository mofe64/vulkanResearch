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
    version: z.string(),
    summary: z.string().optional(),
    source: z.string().optional(), // e.g. "Preprint · 9 pages · PDF and code"
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, posts };
