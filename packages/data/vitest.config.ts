import { defineConfig } from "vitest/config";

export default defineConfig({ ssr: { resolve: { conditions: ["@brianhung/source"] } } });
