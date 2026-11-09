import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

// One entry per package subpath, as Base UI's package.json exports one per component
const entries = {
  index: "src/index.ts",
  "floating-ui": "src/floating-ui.ts",
  "react-aria": "src/react-aria.ts",
  "picker/index": "src/picker/index.ts",
  "emoji/index": "src/emoji/index.ts",
  "provider/index": "src/provider/index.ts",
  "popover/floating-ui/index": "src/popover/floating-ui/index.ts",
  "popover/react-aria/index": "src/popover/react-aria/index.ts",
  "suggestions/floating-ui/index": "src/suggestions/floating-ui/index.ts",
  "suggestions/react-aria/index": "src/suggestions/react-aria/index.ts",
};

// One output file per source module so bundlers can drop unused parts (an <Emoji> alone doesn't load the picker)
const modules = Object.fromEntries(readdirSync("src", { recursive: true, encoding: "utf8" }).flatMap((f) => (/(?<!\.test)\.tsx?$/.test(f) && !f.startsWith("styles") ? [[f.replace(/\.tsx?$/, ""), `src/${f}`]] : [])));

export default defineConfig({
  entry: { ...modules, ...entries },
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
