import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { BUILT_IN, CUSTOM } from "../src/corpus";
import { JEV_INPUT_PRICE, MAX_OPTIONS, chunk, labelOptions, pack } from "../src/jev";
import { mockEnv, post, type GatewayCall } from "./mocks";

const fetch = (request: Request, env: ReturnType<typeof mockEnv>["env"]) => (worker.fetch as (r: Request, e: typeof env) => Promise<Response>)(request, env);
const seeded = async (overrides = {}) => {
  const mock = mockEnv(overrides);
  const res = await fetch(post("/admin/seed", {}, { authorization: "Bearer admin" }), mock.env);
  expect(res.status).toBe(200);
  return mock;
};

describe("CORS", () => {
  it("answers preflight for allowed origins, wildcard ports included", async () => {
    const { env } = mockEnv();
    const res = await fetch(new Request("https://w.dev/embed-search", { method: "OPTIONS", headers: { origin: "http://localhost:5199" } }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5199");
    expect(res.headers.get("access-control-allow-headers")).toContain("content-type");
  });
  it("refuses other origins", async () => {
    const { env } = mockEnv();
    const pre = await fetch(new Request("https://w.dev/embed-search", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), env);
    expect(pre.status).toBe(403);
    expect(pre.headers.get("access-control-allow-origin")).toBeNull();
    const res = await fetch(post("/embed-search", { query: "cat" }, { origin: "https://evil.example" }), env);
    expect(res.status).toBe(403);
  });
  it("doesn't treat dots in the allowlist as wildcards", async () => {
    const { env } = mockEnv();
    const res = await fetch(post("/embed-search", { query: "cat" }, { origin: "https://emojixexample.com" }), env);
    expect(res.status).toBe(403);
  });
  it("lets server-to-server calls (no Origin) through", async () => {
    const { env } = await seeded();
    const res = await fetch(new Request("https://w.dev/embed-search", { method: "POST", body: JSON.stringify({ query: "cat" }) }), env);
    expect(res.status).toBe(200);
  });
});

describe("POST /admin/seed", () => {
  it("needs ADMIN_TOKEN", async () => {
    expect((await fetch(post("/admin/seed", {}), mockEnv({ ADMIN_TOKEN: undefined }).env)).status).toBe(403);
    expect((await fetch(post("/admin/seed", {}, { authorization: "Bearer nope" }), mockEnv().env)).status).toBe(401);
  });
  it("embeds the corpus in batches of 100 and upserts every emoji, custom ones tagged", async () => {
    const { store, aiCalls, upserts } = await seeded();
    expect(store.size).toBe(BUILT_IN.length + CUSTOM.length);
    expect(aiCalls.every((c) => c.model === "@cf/baai/bge-large-en-v1.5" && c.text.length <= 100)).toBe(true);
    expect(aiCalls).toHaveLength(Math.ceil(store.size / 100));
    expect(upserts.every((u) => u.length <= 500)).toBe(true);
    expect(store.get("1f44d")?.metadata).toEqual({ custom: false });
    expect(store.get("lgtm")?.metadata).toMatchObject({ custom: true, name: "looks good to me" });
    // name, shortcodes, tags (and description) are embedded
    expect(aiCalls.flatMap((c) => c.text)).toContain(
      "thumbs up. +1, thumbsup. good, hand, like, yes".replace("good, hand, like, yes", BUILT_IN.find((e) => e.id === "1f44d")!.tags.join(", ")),
    );
  });
  it("pages with from/count", async () => {
    const { env } = mockEnv();
    const res = await fetch(post("/admin/seed", { from: 0, count: 250 }, { authorization: "Bearer admin" }), env);
    expect(await res.json()).toMatchObject({ from: 0, next: 250, done: false, upserted: 250 });
    const last = await fetch(post("/admin/seed", { from: 1900, count: 500 }, { authorization: "Bearer admin" }), env);
    expect(await last.json()).toMatchObject({ next: BUILT_IN.length + CUSTOM.length, done: true });
  });
  it("indexes an uploaded custom emoji list", async () => {
    const { env, store } = mockEnv();
    const custom = [{ id: "party-parrot", name: "party parrot", imageUrl: "https://example.com/p.gif", shortcodes: ["partyparrot"], description: "A dancing parrot for celebrations." }];
    const res = await fetch(post("/admin/seed", { custom }, { authorization: "Bearer admin" }), env);
    expect(await res.json()).toMatchObject({ total: 1, upserted: 1, done: true });
    expect(store.get("party-parrot")?.metadata).toEqual({ custom: true, name: "party parrot", imageUrl: "https://example.com/p.gif" });
  });
  it("rejects malformed custom lists", async () => {
    const res = await fetch(post("/admin/seed", { custom: [{ id: "x" }] }, { authorization: "Bearer admin" }), mockEnv().env);
    expect(res.status).toBe(400);
    const long = await fetch(post("/admin/seed", { custom: [{ id: "x".repeat(65), name: "x", imageUrl: "u" }] }, { authorization: "Bearer admin" }), mockEnv().env);
    expect(long.status).toBe(400);
  });
});

describe("POST /embed-search", () => {
  it("validates the body", async () => {
    const { env } = mockEnv();
    for (const body of [{}, { query: "" }, { query: "x".repeat(201) }, { query: "cat", limit: 0 }, { query: "cat", limit: 51 }, { query: "cat", custom: "yes" }]) {
      expect((await fetch(post("/embed-search", body), env)).status).toBe(400);
    }
  });
  it("embeds the query with the BGE instruction and returns ranked hits with timings", async () => {
    const { env, aiCalls } = await seeded();
    const res = await fetch(post("/embed-search", { query: "thumbs up", limit: 5 }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("server-timing")).toMatch(/embed;dur=\d+, vectorize;dur=\d+/);
    const body = (await res.json()) as any;
    expect(aiCalls.at(-1)!.text).toEqual(["Represent this sentence for searching relevant passages: thumbs up"]);
    expect(body.hits).toHaveLength(5);
    expect(body.hits.map((h: any) => h.unified)).toContain("1f44d");
    expect(body.hits[0].score).toBeGreaterThan(body.hits[4].score);
    expect(body.timings).toEqual({ embedMs: expect.any(Number), queryMs: expect.any(Number) });
    expect(body.usage.model).toBe("@cf/baai/bge-large-en-v1.5");
  });
  it("includes custom emoji only when asked", async () => {
    const { env, queries } = await seeded();
    const without = (await (await fetch(post("/embed-search", { query: "looks good to me lgtm", limit: 10 }), env)).json()) as any;
    expect(without.hits.some((h: any) => h.unified === "lgtm")).toBe(false);
    expect(queries.at(-1)).toMatchObject({ topK: 50, returnMetadata: "all" });
    const withCustom = (await (await fetch(post("/embed-search", { query: "looks good to me lgtm", limit: 10, custom: true }), env)).json()) as any;
    expect(withCustom.hits[0]).toMatchObject({ unified: "lgtm", custom: true, imageUrl: expect.stringMatching(/^data:image\/svg/) });
    expect(queries.at(-1)).toMatchObject({ topK: 10 });
  });
  it("says so when the index hasn't been seeded", async () => {
    const res = await fetch(post("/embed-search", { query: "cat" }), mockEnv().env);
    expect(res.status).toBe(503);
    expect(((await res.json()) as any).error).toMatch(/seed/);
  });
});

/** A fake Jev: probability by word overlap between the query (state) and each option. */
function fakeJev(call: GatewayCall) {
  const words = new Set(String(call.query.state).toLowerCase().split(/\W+/).filter(Boolean));
  const answers: Record<string, unknown> = {};
  let tokens = 0;
  for (const [id, q] of Object.entries<any>(call.query.questions)) {
    const options = Object.keys(q.criteria);
    if (options.length > MAX_OPTIONS) return new Response("too many options", { status: 422 });
    const raw = options.map((o) => 0.01 + o.toLowerCase().split(/\W+/).filter((w) => words.has(w)).length);
    const sum = raw.reduce((a, b) => a + b, 0);
    answers[id] = { type: "choice", choice: options[raw.indexOf(Math.max(...raw))], probabilities: Object.fromEntries(options.map((o, i) => [o, raw[i]! / sum])) };
    tokens += options.join(" ").length / 4;
  }
  return Response.json({ model: "jev-1.13.0", answers, usage: { input_tokens: Math.round(tokens), output_tokens: 3 } });
}

describe("POST /jev", () => {
  it("is 501 without TYPESAFE_API_KEY", async () => {
    const res = await fetch(post("/jev", { query: "cat" }), mockEnv({ TYPESAFE_API_KEY: undefined }).env);
    expect(res.status).toBe(501);
  });
  it("asks Jev through the AI Gateway custom provider, in two rounds", async () => {
    const { env, gatewayCalls } = mockEnv({ gateway: fakeJev });
    const res = await fetch(post("/jev", { query: "thumbs up", limit: 8 }), env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as any;
    // round 1: every built-in name across <=255-option questions, packed into one request; round 2: finalists
    expect(gatewayCalls).toHaveLength(2);
    for (const call of gatewayCalls) {
      expect(call).toMatchObject({ gateway: "default", provider: "custom-typesafe", endpoint: "v1/systemone" });
      expect(call.headers.Authorization).toBe("Bearer ts-key");
      expect(call.query.model).toBe("jev-latest");
      expect(call.query.state).toBe("thumbs up");
    }
    const round1 = Object.values<any>(gatewayCalls[0]!.query.questions);
    expect(round1).toHaveLength(Math.ceil(BUILT_IN.length / 250));
    expect(round1.reduce((n, q) => n + Object.keys(q.criteria).length, 0)).toBe(BUILT_IN.length);
    expect(Object.keys(gatewayCalls[1]!.query.questions.q0.criteria).length).toBeLessThanOrEqual(MAX_OPTIONS);
    expect(body.hits[0].unified).toBe("1f44d");
    expect(body.hits).toHaveLength(8);
    expect(body.model).toBe("jev-1.13.0");
    expect(body.usage.requests).toBe(2);
    expect(body.usage.costUsd).toBeCloseTo(body.usage.inputTokens * JEV_INPUT_PRICE);
    expect(body.timings).toEqual({ round1Ms: expect.any(Number), round2Ms: expect.any(Number) });
  });
  it("offers custom emoji when asked", async () => {
    const { env, gatewayCalls } = mockEnv({ gateway: fakeJev });
    const body = (await (await fetch(post("/jev", { query: "rubber duck", limit: 3, custom: true }), env)).json()) as any;
    expect(Object.values<any>(gatewayCalls[0]!.query.questions).some((q) => "rubber duck (custom)" in q.criteria)).toBe(true);
    expect(body.hits[0]).toMatchObject({ unified: "rubber-duck", custom: true });
  });
  it("reports upstream errors as 502", async () => {
    const { env } = mockEnv({ gateway: () => new Response("Service Unavailable", { status: 503 }) });
    const res = await fetch(post("/jev", { query: "cat" }), env);
    expect(res.status).toBe(502);
    expect(((await res.json()) as any).error).toMatch(/Jev 503/);
  });
});

describe("Jev helpers", () => {
  it("labels are unique", () => {
    const labels = labelOptions([...BUILT_IN, ...CUSTOM, { id: "x", name: "thumbs up", shortcodes: [], tags: [] }]);
    expect(labels.size).toBe(BUILT_IN.length + CUSTOM.length + 1);
    expect(labels.get("thumbs up (2)")?.id).toBe("x");
  });
  it("packs questions under the token budget", () => {
    const questions = chunk(Array.from({ length: 1000 }, (_, i) => `option number ${i}`), 250);
    expect(pack(questions, 1_000_000)).toHaveLength(1);
    expect(pack(questions, 3000)).toHaveLength(4);
  });
});

describe("GET /health", () => {
  it("reports what's configured", async () => {
    const { env } = await seeded({ TYPESAFE_API_KEY: undefined });
    const body = (await (await fetch(new Request("https://w.dev/health", { headers: { origin: "http://localhost:5199" } }), env)).json()) as any;
    expect(body.embed.vectors).toBe(BUILT_IN.length + CUSTOM.length);
    expect(body.jev.configured).toBe(false);
  });
});
