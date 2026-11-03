// Fills the Vectorize index through the deployed Worker's POST /api/admin/seed, which
// embeds with Workers AI and upserts with the Vectorize binding. Needs only the site's
// URL and its ADMIN_TOKEN: no account id or API token.
//
//   npm run seed -- --url https://emoji-picker.<you>.workers.dev --token $ADMIN_TOKEN
//   npm run seed -- --url … --token … --custom ./my-emoji.json   index your own emoji too
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    url: { type: "string", default: process.env.SITE_URL },
    token: { type: "string", default: process.env.ADMIN_TOKEN },
    custom: { type: "string" },
    // Emoji per request: a few Workers AI calls and one upsert each.
    batch: { type: "string", default: "500" },
  },
});
if (!values.url || !values.token) {
  console.error("usage: npm run seed -- --url <site url> --token <ADMIN_TOKEN> [--custom emoji.json]");
  process.exit(1);
}

const custom = values.custom ? JSON.parse(readFileSync(values.custom, "utf8")) : undefined;
const endpoint = new URL("/api/admin/seed", values.url);
for (let from = 0; ; ) {
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
console.log("Done. Vectorize applies upserts asynchronously; searches see them within a few seconds.");
