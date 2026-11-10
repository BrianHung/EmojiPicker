import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import base from "./vitest.config";

const react18 = fileURLToPath(new URL("../../node_modules/.react18/node_modules/", import.meta.url));

export default mergeConfig(
  base,
  defineConfig({
    resolve: { alias: [{ find: /^(react|react-dom)(\/.*)?$/, replacement: `${react18}$1$2` }] },
    test: { execArgv: ["--import", fileURLToPath(new URL("./test/react18.mjs", import.meta.url))] },
  }),
);
