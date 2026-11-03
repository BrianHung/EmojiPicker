import { defineConfig } from "vitest/config";

// Unit tests run in Node with the AI and Vectorize bindings mocked (test/mocks.ts).
export default defineConfig({ test: { include: ["test/**/*.test.ts"] } });
