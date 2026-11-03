// Bindings and settings. Declared by hand (rather than generated) so the tests and
// both config files (cloudflare.config.ts, wrangler.jsonc) agree on one shape.
export interface Env {
  /** Workers AI: embeds queries and the corpus, and reaches AI Gateway. */
  AI: Ai;
  /** Vectorize index, 1024 dimensions, cosine. */
  EMOJI_INDEX: Vectorize;
  /** Comma-separated origins allowed to call the API. `*` matches any characters: `http://localhost:*`. */
  ALLOWED_ORIGINS: string;
  /** AI Gateway id. `default` is created on first use. */
  AI_GATEWAY_ID: string;
  /** The AI Gateway custom provider for TypeSafe, as `custom-<slug>`. */
  JEV_PROVIDER: string;
  /** TypeSafe model: `jev-latest` or a pinned `jev-1.13.0`. */
  JEV_MODEL: string;
  /** Secret. Without it, POST /jev answers 501. */
  TYPESAFE_API_KEY?: string;
  /** Secret. Bearer token for POST /admin/seed. */
  ADMIN_TOKEN?: string;
}
