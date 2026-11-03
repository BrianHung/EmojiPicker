// A small server for the browser checks, so they don't depend on the demo's dev
// server: `npm run e2e:serve -w @brianhung/emoji-picker`, then
// `BASE_URL=http://localhost:5299 npm run test:e2e -w @brianhung/emoji-picker`.
// Uses the demo's Tailwind CSS and shadcn files for the fixtures that render them.
import { fileURLToPath } from "node:url";
import { defaultClientConditions, defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const here = fileURLToPath(new URL(".", import.meta.url));
const repo = fileURLToPath(new URL("../../../../", import.meta.url));

export default defineConfig({
  root: here,
  cacheDir: fileURLToPath(new URL("../../node_modules/.vite-e2e", import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    conditions: ["@brianhung/source", ...defaultClientConditions],
    alias: [{ find: /^@\//, replacement: `${repo}apps/demo/` }],
  },
  server: { port: 5299, strictPort: true, fs: { allow: [repo] } },
});
