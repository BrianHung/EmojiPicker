// The real Worker (worker/index.ts) on a local port, with the in-memory bindings from
// mocks.ts: hashed-word embeddings and a word-overlap decision model. Rankings are not
// meaningful; it exists for end-to-end tests and for offline work on the page.
//
//   npx tsx worker/test/mock-server.ts [--port 8799] [--assets .cloudflare/output/v0/workers/default/assets]
//
// With --assets it also serves the built site, like the deployed Worker does.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { parseArgs } from "node:util";
import worker from "../index";
import { mockEnv, post } from "./mocks";

const { values } = parseArgs({ options: { port: { type: "string", default: "8799" }, assets: { type: "string" } } });
const port = Number(values.port);
const { env } = mockEnv({ ALLOWED_ORIGINS: "http://localhost:*" });
const handle = worker.fetch as (request: Request, e: typeof env) => Promise<Response>;
await handle(post("/api/admin/seed", {}, { authorization: `Bearer ${env.ADMIN_TOKEN}` }), env);

const TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".webp": "image/webp",
  ".wasm": "application/wasm",
  ".md": "text/markdown",
  ".txt": "text/plain",
};

function asset(path: string): string | null {
  if (!values.assets) return null;
  let file = normalize(join(values.assets, decodeURIComponent(path)));
  if (!file.startsWith(normalize(values.assets))) return null;
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  return existsSync(file) ? file : null;
}

createServer(async (req, res) => {
  const path = (req.url ?? "/").split("?")[0]!;
  if (!path.startsWith("/api/")) {
    const file = asset(path);
    if (!file) return void res.writeHead(404).end("not found");
    res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream" });
    return void createReadStream(file).pipe(res);
  }
  const chunks: Buffer[] = [];
  for await (const c of req) chunks.push(c as Buffer);
  const body = ["GET", "HEAD", "OPTIONS"].includes(req.method ?? "") ? undefined : Buffer.concat(chunks);
  const request = new Request(`http://localhost:${port}${req.url}`, { method: req.method, headers: req.headers as Record<string, string>, body });
  // A network-ish delay, so latency reads like a round trip.
  await new Promise((r) => setTimeout(r, 40));
  const response = await handle(request, env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`mock site + API on http://localhost:${port}`));
