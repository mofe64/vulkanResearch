// @ts-check
import { defineConfig } from "astro/config";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import remarkObsidian from "./src/lib/remark-obsidian.mjs";

export default defineConfig({
  // site: "https://vulkan.research",  // set the real domain before deploying (used for canonical URLs)
  integrations: [mdx(), react()],
  vite: {
    // three.js is one ~740 KB (≈180 KB gzipped) chunk, but it is lazy-loaded only where a model appears.
    build: { chunkSizeWarningLimit: 800 },
    // These are only reached through dynamic import(), so Vite's dev server would discover them late and
    // re-bundle mid-session ("504 Outdated Optimize Dep"). Pre-bundling them at startup avoids that.
    optimizeDeps: {
      include: [
        "three",
        "three/addons/loaders/GLTFLoader.js",
        "three/addons/controls/OrbitControls.js",
        "three/addons/libs/meshopt_decoder.module.js",
        "mermaid",
      ],
    },
  },
  markdown: {
    // Callouts, ![[embeds]], [[wikilinks]] and mermaid blocks from Obsidian notes.
    remarkPlugins: [remarkObsidian],
    // Code blocks in posts are highlighted at build time, so no highlighter JS ships to readers.
    shikiConfig: { theme: "github-light" },
  },
});
