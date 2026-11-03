// Fills the Vectorize index through the deployed Worker's POST /admin/seed, which
// embeds with Workers AI and upserts with the Vectorize binding: no account id or
// API token needed here, only the Worker's URL and its ADMIN_TOKEN.
//
//   node scripts/seed.ts --url https://emoji-search.<you>.workers.dev --token $ADMIN_TOKEN
//   node scripts/seed.ts --url … --token … --custom ./my-emoji.json   also index your own emoji
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: process.env.SEARCH_WORKER_URL },
    token: { type: "string", default: process.env.ADMIN_TOKEN },
    custom: { type: "string" },
    // Emoji per request: each one is a few Workers AI calls and one upsert.
    batch: { type: "string", default: "500" },
  },
});
if (!values.url || !values.token) {
  console.error("usage: node scripts/seed.ts --url <worker url> --token <ADMIN_TOKEN> [--custom emoji.json]");
  process.exit(1);
}

const custom = values.custom ? JSON.parse(readFileSync(values.custom, "utf8")) : undefined;
const endpoint = new URL("/admin/seed", values.url);
let from = 0;
for (;;) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${values.token}`, "content-type": "application/json" },
    body: JSON.stringify({ from, count: Number(values.batch), custom }),
  });
  const result = (await response.json()) as { error?: string; next: number; total: number; done: boolean };
  if (!response.ok) throw new Error(`seed: ${response.status} ${result.error ?? ""}`);
  console.log(`${result.next}/${result.total}${custom ? " custom" : ""}`);
  if (result.done) break;
  from = result.next;
}
console.log("Upserted. Vectorize applies mutations asynchronously; queries see them within a few seconds.");
