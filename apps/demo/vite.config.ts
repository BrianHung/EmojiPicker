import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defaultClientConditions, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import { markdownDocs } from "./plugins/markdown-docs";
import { mdx } from "./plugins/mdx";
import { entries as pages, site } from "./plugins/site";

const workspace = existsSync(new URL("../../packages/react/src", import.meta.url));

export default defineConfig({
  plugins: [
    mdx(),
    react(),
    tailwindcss(),
    markdownDocs(),
    site(),
    {
      name: "react-aria-demos",
      enforce: "pre",
      resolveId(source, importer) {
        if (source === "@brianhung/emoji-picker-react/floating-ui" && importer?.endsWith("?react-aria")) return this.resolve("@brianhung/emoji-picker-react/react-aria", importer, { skipSelf: true });
      },
    },
    {
      name: "drop-ort-wasm",
      generateBundle(_, bundle) {
        for (const file of Object.keys(bundle)) if (/ort-wasm.*\.wasm$/.test(file)) delete bundle[file];
      },
    },
    cloudflare({ remoteBindings: process.env.CLOUDFLARE_REMOTE_BINDINGS === "1" }),
  ],
  resolve: {
    conditions: [...(workspace ? ["@brianhung/source"] : []), ...defaultClientConditions],
    alias: [
      ...(process.env.E2E_POPOVER === "react-aria" ? [{ find: /^@brianhung\/emoji-picker-react\/floating-ui$/, replacement: "@brianhung/emoji-picker-react/react-aria" }] : []),
      { find: /^@\/registry\//, replacement: fileURLToPath(new URL("./registry/", import.meta.url)) },
      { find: /^@\/components\/ui\/emoji-picker$/, replacement: fileURLToPath(new URL("./registry/emoji-picker.tsx", import.meta.url)) },
      { find: /^@\/(?:hooks|lib)\/(emoji-(?:tiptap|lexical|prosemirror))$/, replacement: fileURLToPath(new URL("./registry/$1.ts", import.meta.url)) },
      { find: /^@\//, replacement: fileURLToPath(new URL("./src/", import.meta.url)) },
    ],
  },
  environments: { client: { build: { rollupOptions: { input: pages } } } },
  optimizeDeps: { entries: Object.values(pages) },
  server: { port: 5199, strictPort: true },
});
