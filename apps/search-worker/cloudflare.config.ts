// Config for the `cf` CLI (cf dev / cf build / cf deploy). wrangler.jsonc mirrors it
// for the Deploy to Cloudflare button and Workers Builds, which read only Wrangler
// config; test/config.test.ts fails if the two drift apart.
//
// Nothing here is tied to an account: `cf deploy` uses the account you logged in
// with, and every name below can be changed.
import { bindings, defineConfig } from "cf/config";
import * as entrypoint from "./src/index.ts" with { type: "cf-worker" };

export default defineConfig({
  worker: {
    name: "emoji-search",
    compatibilityDate: "2026-10-30",
    entrypoint,
    observability: { enabled: true },
    env: {
      AI: bindings.ai(),
      // Create it first: 1024 dimensions, cosine (see README).
      EMOJI_INDEX: bindings.vectorize({ name: "emoji-bge-large" }),
      ALLOWED_ORIGINS: bindings.text("http://localhost:*,https://emoji.brianhung.me"),
      AI_GATEWAY_ID: bindings.text("default"),
      JEV_PROVIDER: bindings.text("custom-typesafe"),
      JEV_MODEL: bindings.text("jev-latest"),
      TYPESAFE_API_KEY: bindings.secret(),
      ADMIN_TOKEN: bindings.secret(),
    },
  },
});
