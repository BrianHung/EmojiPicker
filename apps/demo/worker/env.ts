export interface Env {
  ASSETS: Fetcher;
  AI: Ai;
  EMOJI_INDEX: Vectorize;
  ALLOWED_ORIGINS: string;
  AI_GATEWAY_ID: string;
  ADMIN_TOKEN?: string;
  SEARCH_LIMIT: RateLimit;
  DECIDE_LIMIT: RateLimit;
}
