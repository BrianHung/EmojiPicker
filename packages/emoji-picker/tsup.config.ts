import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

// One output file per source module, importing its siblings as they are in the source: a bundler
// then drops the modules a consumer doesn't use (`sideEffects`), so an app that renders only
// <Emoji> doesn't load the picker, and a picker alone doesn't load the popover or the tapback.
const modules = (dir: string) => Object.fromEntries(readdirSync(`src/${dir}`, { recursive: true, encoding: "utf8" }).flatMap((f) => (/(?<!\.test)\.tsx?$/.test(f) ? [[`${dir}/${f.replace(/\.tsx?$/, "")}`, `src/${dir}/${f}`]] : [])));

export default defineConfig([
  {
    entry: { index: "src/index.ts", search: "src/search.ts", "floating-ui": "src/floating-ui.ts", "react-aria": "src/react-aria.ts", tiptap: "src/tiptap.ts", lexical: "src/lexical.ts", prosemirror: "src/prosemirror.ts", ...modules("core"), ...modules("react") },
    format: ["esm"],
    dts: { entry: { index: "src/index.ts", "core/index": "src/core/index.ts", search: "src/search.ts", "floating-ui": "src/floating-ui.ts", "react-aria": "src/react-aria.ts", tiptap: "src/tiptap.ts", lexical: "src/lexical.ts", prosemirror: "src/prosemirror.ts" } },
    sourcemap: true,
    clean: true,
    external: ["react", "react-dom"],
    esbuildPlugins: [
      {
        name: "sibling-modules",
        setup(build) {
          build.onResolve({ filter: /^\.\.?\// }, ({ path, kind, resolveDir }) => (kind === "entry-point" ? undefined : { path: [".ts", ".tsx"].some((ext) => existsSync(join(resolveDir, path + ext))) ? `${path}.js` : `${path}/index.js`, external: true }));
        },
      },
    ],
  },
  {
    entry: { cli: "scripts/cli.ts" },
    format: ["esm"],
    platform: "node",
    target: "node20",
  },
]);
