import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defaultClientConditions, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { markdownDocs } from "./plugins/markdown-docs";
import { mdx } from "./plugins/mdx";

const workspace = existsSync(new URL("../../packages/emoji-picker/src", import.meta.url));

const pages = {
  main: "index.html",
  shot: "shot.html",
  gallery: "gallery/index.html",
  examples: "examples/index.html",
  tiptap: "examples/tiptap/index.html",
  lexical: "examples/lexical/index.html",
  "semantic-search": "examples/semantic-search/index.html",
  "custom-emoji": "examples/custom-emoji/index.html",
  virtualizer: "examples/virtualizer/index.html",
};

export default defineConfig({
  plugins: [
    mdx(),
    react(),
    tailwindcss(),
    markdownDocs(),
    // Transformers.js loads the ONNX Runtime wasm from jsDelivr; the bundled copy (25.6 MiB) is
    // unused and over the Workers 25 MiB asset limit.
    {
      name: "drop-ort-wasm",
      generateBundle(_, bundle) {
        for (const file of Object.keys(bundle)) if (/ort-wasm.*\.wasm$/.test(file)) delete bundle[file];
      },
    },
    // The site's Worker (worker/index.ts, /api/*) runs in workerd next to the pages. Workers AI (Clef)
    // has no local mode, so /api answers 503 in dev unless you're logged in and set
    // CLOUDFLARE_REMOTE_BINDINGS=1 to use the real ones.
    cloudflare({ remoteBindings: process.env.CLOUDFLARE_REMOTE_BINDINGS === "1" }),
  ],
  resolve: {
    // In the monorepo, the library resolves to its TypeScript source (the `@brianhung/source` export
    // condition, scoped so other packages' `source` conditions stay off): no build step in dev.
    // Deployed on its own, apps/demo uses the published build.
    conditions: [...(workspace ? ["@brianhung/source"] : []), ...defaultClientConditions],
    // `@/…` is src/ (shadcn's aliases in components.json); `@/registry/…` is the registry item the site renders.
    alias: [
      { find: /^@\/registry\//, replacement: fileURLToPath(new URL("./registry/", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
    ],
  },
  // The pages, for the client build only (the Worker environment has its own entry).
  environments: { client: { build: { rollupOptions: { input: pages } } } },
  // Scan only the pages for dependencies; capture/ holds Node scripts (Playwright) that never ship.
  optimizeDeps: { entries: Object.values(pages) },
  server: { port: 5199, strictPort: true, watch: { ignored: ["**/capture/out/**", "**/capture/*.mjs", "**/capture/*.py"] } },
});
