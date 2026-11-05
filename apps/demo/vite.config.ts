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
    {
      name: "react-aria-demos",
      enforce: "pre",
      resolveId(source, importer) {
        if (source === "@brianhung/emoji-picker/floating-ui" && importer?.endsWith("?react-aria")) return this.resolve("@brianhung/emoji-picker/react-aria", importer, { skipSelf: true });
      },
    },
    // ONNX Runtime wasm loads from jsDelivr; the bundled 25.6 MiB copy is over the Workers 25 MiB asset limit
    {
      name: "drop-ort-wasm",
      generateBundle(_, bundle) {
        for (const file of Object.keys(bundle)) if (/ort-wasm.*\.wasm$/.test(file)) delete bundle[file];
      },
    },
    // Workers AI has no local mode: /api answers 503 in dev unless CLOUDFLARE_REMOTE_BINDINGS=1
    cloudflare({ remoteBindings: process.env.CLOUDFLARE_REMOTE_BINDINGS === "1" }),
  ],
  resolve: {
    // Scoped `@brianhung/source` condition, so other packages' `source` conditions stay off
    conditions: [...(workspace ? ["@brianhung/source"] : []), ...defaultClientConditions],
    alias: [
      ...(process.env.E2E_POPOVER === "react-aria" ? [{ find: /^@brianhung\/emoji-picker\/floating-ui$/, replacement: "@brianhung/emoji-picker/react-aria" }] : []),
      { find: /^@\/registry\//, replacement: fileURLToPath(new URL("./registry/", import.meta.url)) },
      { find: /^@\/components\/ui\/emoji-picker$/, replacement: fileURLToPath(new URL("./registry/emoji-picker.tsx", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
    ],
  },
  environments: { client: { build: { rollupOptions: { input: pages } } } },
  // Scan only the pages: capture/ holds Node scripts (Playwright) that never ship
  optimizeDeps: { entries: Object.values(pages) },
  server: { port: 5199, strictPort: true, watch: { ignored: ["**/capture/out/**", "**/capture/*.mjs", "**/capture/*.py"] } },
});
