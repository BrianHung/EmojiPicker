import { defineConfig } from "vitest/config";

export default defineConfig({ test: { root: "worker", include: ["test/**/*.test.ts"] } });
