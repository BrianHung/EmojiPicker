import { defineConfig } from "vitest/config";

const resolve = { conditions: ["@brianhung/source"] };

export default defineConfig({ resolve, ssr: { resolve } });
