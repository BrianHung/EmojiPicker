import { fileURLToPath } from "node:url";
import { defaultClientConditions, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { markdownDocs } from "./markdown-docs";

export default defineConfig({
  plugins: [react(), tailwindcss(), markdownDocs()],
  resolve: {
    // Workspace packages resolve to their TypeScript source (the `@brianhung/source` export condition, scoped so other packages' `source` conditions stay off): no build step in dev.
    conditions: ["@brianhung/source", ...defaultClientConditions],
    // shadcn's `@/lib/utils`, as in an app the registry item is installed into.
    // shadcn's `@/…` aliases (components.json): `@/lib/utils`, `@/components/ui/*`.
    alias: [{ find: /^@\//, replacement: fileURLToPath(new URL("./", import.meta.url)) }],
  },
  build: { rollupOptions: { input: { main: "index.html", shot: "shot.html", tiptap: "examples/tiptap/index.html", lexical: "examples/lexical/index.html", gallery: "gallery/index.html", examples: "examples/index.html" } } },
  server: { port: 5199, strictPort: true },
});
