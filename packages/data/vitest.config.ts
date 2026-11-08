import { defineConfig } from "vitest/config";

export default defineConfig({ ssr: { resolve: { conditions: ["@emoji-components/source"] } } });
