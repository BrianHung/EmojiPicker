import { defineConfig } from "vitest/config";

// The Worker's unit tests run in Node with the AI binding mocked (test/mocks.ts).
export default defineConfig({ test: { root: "worker", include: ["test/**/*.test.ts"] } });
