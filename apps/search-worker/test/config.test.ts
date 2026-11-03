// cloudflare.config.ts (cf CLI) and wrangler.jsonc (Deploy button, Workers Builds)
// must describe the same Worker.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const wrangler = JSON.parse(read("wrangler.jsonc").replace(/^\s*\/\/.*$/gm, ""));
const cf = read("cloudflare.config.ts");
const text = (key: string) => cf.match(new RegExp(`${key}: bindings\\.text\\("([^"]*)"\\)`))?.[1];

describe("config", () => {
  it("cloudflare.config.ts matches wrangler.jsonc", () => {
    expect(cf).toContain(`name: "${wrangler.name}"`);
    expect(cf).toContain(`compatibilityDate: "${wrangler.compatibility_date}"`);
    expect(cf).toContain(`${wrangler.ai.binding}: bindings.ai()`);
    expect(cf).toContain(`${wrangler.vectorize[0].binding}: bindings.vectorize({ name: "${wrangler.vectorize[0].index_name}" })`);
    for (const [key, value] of Object.entries(wrangler.vars)) expect(text(key), key).toBe(value);
  });
  it("declares every secret in .dev.vars.example", () => {
    const secrets = [...cf.matchAll(/(\w+): bindings\.secret\(\)/g)].map((m) => m[1]);
    const example = read(".dev.vars.example");
    for (const s of secrets) expect(example).toMatch(new RegExp(`^${s}=`, "m"));
    expect(Object.keys(JSON.parse(read("package.json")).cloudflare.bindings).sort()).toEqual(secrets.sort());
  });
  it("has no account id", () => {
    expect(wrangler.account_id).toBeUndefined();
    expect(cf).not.toMatch(/accountId/);
  });
});
