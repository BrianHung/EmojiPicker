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
  await new Promise((r) => setTimeout(r, 40));
  const response = await handle(request, env);
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
}).listen(port, () => console.log(`mock site + API on http://localhost:${port}`));
