// Bindings and settings. Declared by hand (rather than generated) so the tests and
// both config files (cloudflare.config.ts, wrangler.jsonc) describe one shape.
export interface Env {
  /** Workers AI: embeds for the vector search, and runs the decision models. */
  AI: Ai;
  /** Vectorize index for POST /api/embed-search: 1024 dimensions, cosine. */
  EMOJI_INDEX: Vectorize;
  /** Comma-separated origins allowed to call the API. `*` matches any characters: `http://localhost:*`. */
  ALLOWED_ORIGINS: string;
  /** AI Gateway id for the decision models. `default` is created on first use. */
  AI_GATEWAY_ID: string;
  /** Secret. Bearer token for POST /api/admin/seed; without it, seeding is off. */
  ADMIN_TOKEN?: string;
}
