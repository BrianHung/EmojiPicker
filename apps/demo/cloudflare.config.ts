import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./worker/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "emoji-picker",
    domains: process.env.CF_DOMAIN?.split(",").filter(Boolean) ?? [],
    compatibilityDate: "2026-10-30",
    entrypoint,
    assets: { runWorkerFirst: ["/api/*"] },
    observability: { enabled: true },
    env: {
      AI: bindings.ai(),
      EMOJI_INDEX: bindings.vectorize({ name: "emoji-bge-large" }),
      ALLOWED_ORIGINS: bindings.text("http://localhost:*"),
      AI_GATEWAY_ID: bindings.text("default"),
      ADMIN_TOKEN: bindings.secret(),
      SEARCH_LIMIT: bindings.rateLimit({ namespace: "1001", simple: { limit: 300, period: 60 } }),
      DECIDE_LIMIT: bindings.rateLimit({ namespace: "1002", simple: { limit: 120, period: 60 } }),
    },
  },
});
