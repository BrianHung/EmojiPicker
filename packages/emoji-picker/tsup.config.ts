import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts", core: "src/core/index.ts", search: "src/search.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: ["react", "react-dom", "emoji-picker-react"],
  },
  {
    entry: { cli: "scripts/cli.ts" },
    format: ["esm"],
    platform: "node",
    target: "node20",
  },
]);
