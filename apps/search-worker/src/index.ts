// Emoji search API for the semantic-search example.
//
//   GET  /health        which backends are configured, and the index size
//   POST /embed-search  Workers AI embeddings + Vectorize
//   POST /jev           TypeSafe's Jev through AI Gateway
//   POST /admin/seed    embed the corpus into Vectorize (Bearer ADMIN_TOKEN)
import { allowedOrigin, corsHeaders } from "./cors";
import { CUSTOM, BUILT_IN } from "./corpus";
import { embedSearch } from "./embed-search";
import type { Env } from "./env";
import { jevSearch, UpstreamError } from "./jev";
import { BadRequest, seed, type SeedRequest } from "./seed";

export type { Env };

const MAX_QUERY = 200;
const MAX_LIMIT = 50;

type SearchBody = { query: string; limit: number; custom: boolean };

function parseSearch(body: unknown): SearchBody | string {
  const { query, limit = 24, custom = false } = (body ?? {}) as Record<string, unknown>;
  if (typeof query !== "string" || !query.trim()) return "query: expected a non-empty string";
  if (query.length > MAX_QUERY) return `query: at most ${MAX_QUERY} characters`;
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) return `limit: expected an integer from 1 to ${MAX_LIMIT}`;
  if (typeof custom !== "boolean") return "custom: expected a boolean";
  return { query: query.trim(), limit, custom };
}

const json = (data: unknown, status: number, headers: Record<string, string>) => Response.json(data, { status, headers });

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env.ALLOWED_ORIGINS ?? "");
    const cors = corsHeaders(origin);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: origin ? 204 : 403, headers: cors });
    }
    // A browser on an origin that isn't allowed gets no CORS headers; refuse early too.
    if (request.headers.has("origin") && !origin) return json({ error: "origin not allowed" }, 403, cors);

    try {
      if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
        const info = await env.EMOJI_INDEX.describe().catch(() => null);
        return json(
          {
            embed: { model: "@cf/baai/bge-large-en-v1.5", vectors: info?.vectorCount ?? null, corpus: BUILT_IN.length + CUSTOM.length },
            jev: { configured: Boolean(env.TYPESAFE_API_KEY), model: env.JEV_MODEL, gateway: env.AI_GATEWAY_ID, provider: env.JEV_PROVIDER },
          },
          200,
          cors,
        );
      }

      if (request.method === "POST" && url.pathname === "/embed-search") {
        const body = parseSearch(await request.json().catch(() => null));
        if (typeof body === "string") return json({ error: body }, 400, cors);
        const result = await embedSearch(env, body);
        if (result.hits.length === 0) {
          const info = await env.EMOJI_INDEX.describe().catch(() => null);
          if (info && info.vectorCount === 0) return json({ error: "The Vectorize index is empty. Run the seed step: POST /admin/seed." }, 503, cors);
        }
        return json(result, 200, { ...cors, "server-timing": `embed;dur=${result.timings.embedMs}, vectorize;dur=${result.timings.queryMs}` });
      }

      if (request.method === "POST" && url.pathname === "/jev") {
        if (!env.TYPESAFE_API_KEY) return json({ error: "TYPESAFE_API_KEY is not set on this Worker." }, 501, cors);
        const body = parseSearch(await request.json().catch(() => null));
        if (typeof body === "string") return json({ error: body }, 400, cors);
        const result = await jevSearch(env, body, request.signal);
        return json(result, 200, { ...cors, "server-timing": `jev1;dur=${result.timings.round1Ms}, jev2;dur=${result.timings.round2Ms}` });
      }

      if (request.method === "POST" && url.pathname === "/admin/seed") {
        if (!env.ADMIN_TOKEN) return json({ error: "Set the ADMIN_TOKEN secret to enable seeding." }, 403, cors);
        if (request.headers.get("authorization") !== `Bearer ${env.ADMIN_TOKEN}`) return json({ error: "unauthorized" }, 401, cors);
        const body = ((await request.json().catch(() => ({}))) ?? {}) as SeedRequest;
        return json(await seed(env, body), 200, cors);
      }

      return json({ error: "not found" }, 404, cors);
    } catch (error) {
      if (error instanceof UpstreamError) return json({ error: error.message }, 502, cors);
      if (error instanceof BadRequest) return json({ error: error.message }, 400, cors);
      console.error(error);
      return json({ error: error instanceof Error ? error.message : String(error) }, 500, cors);
    }
  },
} satisfies ExportedHandler<Env>;
