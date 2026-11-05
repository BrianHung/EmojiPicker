import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

const entries = { index: "src/index.ts", "floating-ui": "src/floating-ui.ts", "react-aria": "src/react-aria.ts", tiptap: "src/tiptap.ts", lexical: "src/lexical.ts" };

// One output file per source module so bundlers can drop unused parts (an <Emoji> alone doesn't load the picker)
const modules = Object.fromEntries(readdirSync("src/react", { recursive: true, encoding: "utf8" }).flatMap((f) => (/(?<!\.test)\.tsx?$/.test(f) ? [[`react/${f.replace(/\.tsx?$/, "")}`, `src/react/${f}`]] : [])));

export default defineConfig({
  entry: { ...entries, ...modules },
  format: ["esm"],
  dts: { entry: entries },
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
  esbuildPlugins: [
    {
      name: "sibling-modules",
      setup(build) {
        build.onResolve({ filter: /^\.\.?\// }, ({ path, kind, resolveDir }) =>
          kind === "entry-point" ? undefined : { path: [".ts", ".tsx"].some((ext) => existsSync(join(resolveDir, path + ext))) ? `${path}.js` : `${path}/index.js`, external: true },
        );
      },
    },
  ],
});
