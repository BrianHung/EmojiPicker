import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { defineConfig } from "tsup";

// One output file per source module so bundlers can drop unused parts
const modules = Object.fromEntries(readdirSync("src", { recursive: true, encoding: "utf8" }).flatMap((f) => (/(?<!\.test)\.ts$/.test(f) ? [[f.replace(/\.ts$/, ""), `src/${f}`]] : [])));

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

export default defineConfig([
  {
    entry: modules,
    format: ["esm"],
    dts: { entry: { index: "src/index.ts", "search/index": "src/search/index.ts", prosemirror: "src/prosemirror.ts" } },
    sourcemap: true,
    clean: true,
    define: { __CORE_VERSION__: JSON.stringify(version) },
    esbuildPlugins: [
      {
        name: "sibling-modules",
        setup(build) {
          build.onResolve({ filter: /^\.\.?\// }, ({ path, kind, resolveDir }) => (kind === "entry-point" ? undefined : { path: existsSync(join(resolveDir, `${path}.ts`)) ? `${path}.js` : `${path}/index.js`, external: true }));
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
