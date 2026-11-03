// The site on Cloudflare, for the `cf` CLI (cf dev / cf build / cf deploy): the Vite
// build as static assets, plus worker/index.ts for /api/*. wrangler.jsonc mirrors this
// for the Deploy to Cloudflare button and Workers Builds, which read only Wrangler
// config; worker/test/config.test.ts fails if the two drift apart.
//
// No account id: deploys go to the account you are logged in to. Every name can change.
import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./worker/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "emoji-picker",
    // Custom domains for this deploy only (CF_DOMAIN=emoji.example.com,www.example.com cf deploy); forks get workers.dev.
    domains: process.env.CF_DOMAIN?.split(",").filter(Boolean) ?? [],
    compatibilityDate: "2026-10-30",
    entrypoint,
    assets: { runWorkerFirst: ["/api/*"] },
    observability: { enabled: true },
    env: {
      AI: bindings.ai(),
      // 1024 dimensions, cosine: `npm run create-index`, then `npm run seed`.
      EMOJI_INDEX: bindings.vectorize({ name: "emoji-bge-large" }),
      ALLOWED_ORIGINS: bindings.text("http://localhost:*"),
      AI_GATEWAY_ID: bindings.text("default"),
      ADMIN_TOKEN: bindings.secret(),
    },
  },
});
