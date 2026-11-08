import { defineConfig } from "vitest/config";

const resolve = { conditions: ["@emoji-components/source"] };

export default defineConfig({ resolve, ssr: { resolve }, test: { setupFiles: ["./test/setup.ts"] } });
