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
      })
      .default({ cad: [] }),
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
