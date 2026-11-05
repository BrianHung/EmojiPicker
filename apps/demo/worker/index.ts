import { allowedOrigin, corsHeaders } from "./cors";
import { BUILT_IN, CUSTOM } from "./corpus";
import { decisionSearch, MODEL } from "./decide";
import { embedSearch, EMBEDDING_MODEL } from "./embed-search";
import type { Env } from "./env";
import { BadRequest, Unavailable, UpstreamError } from "./errors";
import { authorized, parseSeed, seed } from "./seed";

export type { Env };

const MAX_QUERY = 200;
const MAX_LIMIT = 50;

type SearchBody = { query: string; limit: number; custom: boolean };

function parseSearch(body: unknown): SearchBody {
  const { query, limit = 24, custom = false } = (body ?? {}) as Record<string, unknown>;
  if (typeof query !== "string" || !query.trim()) throw new BadRequest("query: expected a non-empty string");
  if (query.length > MAX_QUERY) throw new BadRequest(`query: at most ${MAX_QUERY} characters`);
  if (typeof limit !== "number" || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new BadRequest(`limit: expected an integer from 1 to ${MAX_LIMIT}`);
  if (typeof custom !== "boolean") throw new BadRequest("custom: expected a boolean");
  return { query: query.trim(), limit, custom };
}

const readJson = (request: Request) => request.json().catch(() => null);

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);
    const origin = allowedOrigin(request, env.ALLOWED_ORIGINS ?? "");
    const cors = corsHeaders(origin);
    const json = (data: unknown, status = 200, headers: Record<string, string> = {}) => Response.json(data, { status, headers: { ...cors, ...headers } });

    if (request.method === "OPTIONS") return new Response(null, { status: origin ? 204 : 403, headers: cors });
    const crossOrigin = request.headers.has("origin") && request.headers.get("origin") !== url.origin;
    if (crossOrigin && !origin) return json({ error: "origin not allowed" }, 403);

    try {
      switch (`${request.method} ${url.pathname}`) {
        case "GET /api/health": {
          const index = await env.EMOJI_INDEX.describe().catch(() => null);
          return json({
            corpus: BUILT_IN.length + CUSTOM.length,
            embed: { model: EMBEDDING_MODEL, vectors: index?.vectorCount ?? null },
            decide: { gateway: env.AI_GATEWAY_ID, model: MODEL },
          });
        }
        case "POST /api/embed-search": {
          const result = await embedSearch(env, parseSearch(await readJson(request)));
          return json(result, 200, { "server-timing": `embed;dur=${result.timings.embedMs}, vectorize;dur=${result.timings.queryMs}` });
        }
        case "POST /api/decide": {
          const result = await decisionSearch(env, parseSearch(await readJson(request)), request.signal);
          return json(result, 200, { "server-timing": `round1;dur=${result.timings.round1Ms}, round2;dur=${result.timings.round2Ms}` });
        }
        case "POST /api/admin/seed": {
          if (!env.ADMIN_TOKEN) return json({ error: "Set the ADMIN_TOKEN secret to enable seeding." }, 403);
          if (!(await authorized(request, env.ADMIN_TOKEN))) return json({ error: "unauthorized" }, 401);
          return json(await seed(env, parseSeed(await readJson(request))));
        }
        default:
          return json({ error: "not found" }, 404);
      }
    } catch (error) {
      if (error instanceof BadRequest) return json({ error: error.message }, 400);
      if (error instanceof Unavailable) return json({ error: "unavailable", message: error.message }, 503);
      if (error instanceof UpstreamError) return json({ error: error.message }, 502);
      console.error(error);
      return json({ error: error instanceof Error ? error.message : String(error) }, 500);
    }
  },
} satisfies ExportedHandler<Env>;
