import { describe, expect, it } from "vitest";
import worker from "../index";
import { BUILT_IN, CUSTOM, emojiText } from "../corpus";
import { MAX_OPTIONS, MAX_QUESTIONS, PRICES, chunk, labelOptions, pack } from "../decide";
import { mockEnv, post } from "./mocks";

type Mock = ReturnType<typeof mockEnv>;
const fetch = (request: Request, env: Mock["env"]) => (worker.fetch as (r: Request, e: typeof env) => Promise<Response>)(request, env);
const ADMIN = { authorization: "Bearer admin" };
const seeded = async (overrides = {}) => {
  const mock = mockEnv(overrides);
  expect((await fetch(post("/api/admin/seed", {}, ADMIN), mock.env)).status).toBe(200);
  return mock;
};
const unreachable = () => Promise.reject(new Error("Binding AI needs to be run remotely"));

describe("CORS", () => {
  it("answers preflight for allowed origins, wildcard ports included", async () => {
    const { env } = mockEnv();
    const res = await fetch(new Request("https://w.dev/api/decide", { method: "OPTIONS", headers: { origin: "http://localhost:5199" } }), env);
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:5199");
    expect(res.headers.get("access-control-allow-headers")).toContain("content-type");
  });
  it("refuses other origins", async () => {
    const { env } = mockEnv();
    const pre = await fetch(new Request("https://w.dev/api/decide", { method: "OPTIONS", headers: { origin: "https://evil.example" } }), env);
    expect(pre.status).toBe(403);
    expect(pre.headers.get("access-control-allow-origin")).toBeNull();
    expect((await fetch(post("/api/decide", { query: "cat", model: "clef" }, { origin: "https://evil.example" }), env)).status).toBe(403);
  });
  it("doesn't treat dots in the allowlist as wildcards", async () => {
    const res = await fetch(post("/api/decide", { query: "cat", model: "clef" }, { origin: "https://emojixexample.com" }), mockEnv().env);
    expect(res.status).toBe(403);
  });
  it("lets same-origin calls through without an allowlist entry", async () => {
    const res = await fetch(post("/api/decide", { query: "cat", model: "clef" }, { origin: "https://emoji-search.example.workers.dev" }), mockEnv({ ALLOWED_ORIGINS: "" }).env);
    expect(res.status).toBe(200);
  });
  it("lets server-to-server calls (no Origin) through", async () => {
    const res = await fetch(new Request("https://w.dev/api/decide", { method: "POST", body: JSON.stringify({ query: "cat", model: "jev" }) }), mockEnv().env);
    expect(res.status).toBe(200);
  });
});

const INVALID_SEARCHES = [{}, { query: "" }, { query: "x".repeat(201) }, { query: "cat", limit: 0 }, { query: "cat", limit: 51 }, { query: "cat", custom: "yes" }];

describe("POST /api/admin/seed", () => {
  it("needs ADMIN_TOKEN", async () => {
    expect((await fetch(post("/api/admin/seed", {}, ADMIN), mockEnv({ ADMIN_TOKEN: undefined }).env)).status).toBe(403);
    expect((await fetch(post("/api/admin/seed", {}), mockEnv().env)).status).toBe(401);
    expect((await fetch(post("/api/admin/seed", {}, { authorization: "Bearer nope" }), mockEnv().env)).status).toBe(401);
  });
  it("embeds the corpus in batches of 100 and upserts every emoji, custom ones tagged", async () => {
    const { store, embedCalls, upserts } = await seeded();
    expect(store.size).toBe(BUILT_IN.length + CUSTOM.length);
    expect(embedCalls.every((c) => c.model === "@cf/baai/bge-large-en-v1.5" && c.text.length <= 100)).toBe(true);
    expect(embedCalls).toHaveLength(Math.ceil(store.size / 100));
    expect(upserts.every((u) => u.length <= 500)).toBe(true);
    expect(store.get("1f44d")?.metadata).toEqual({ custom: false });
    expect(store.get("rubber-duck")?.metadata).toMatchObject({ custom: true, name: "rubber duck" });
    expect(embedCalls.flatMap((c) => c.text)).toContain(emojiText(BUILT_IN.find((e) => e.id === "1f44d")!));
  });
  it("pages with from/count", async () => {
    const { env } = mockEnv();
    const first = await fetch(post("/api/admin/seed", { from: 0, count: 250 }, ADMIN), env);
    expect(await first.json()).toMatchObject({ from: 0, next: 250, done: false, upserted: 250 });
    const last = await fetch(post("/api/admin/seed", { from: 1900, count: 500 }, ADMIN), env);
    expect(await last.json()).toMatchObject({ next: BUILT_IN.length + CUSTOM.length, done: true });
  });
  it("indexes an uploaded custom emoji list", async () => {
    const { env, store } = mockEnv();
    const custom = [{ id: "party-parrot", name: "party parrot", imageUrl: "https://example.com/p.gif", shortcodes: ["partyparrot"], description: "A dancing parrot for celebrations." }];
    expect(await (await fetch(post("/api/admin/seed", { custom }, ADMIN), env)).json()).toMatchObject({ total: 1, upserted: 1, done: true });
    expect(store.get("party-parrot")?.metadata).toEqual({ custom: true, name: "party parrot", imageUrl: "https://example.com/p.gif" });
  });
  it("rejects malformed bodies", async () => {
    for (const body of [{ custom: [{ id: "x" }] }, { custom: [{ id: "x".repeat(65), name: "x", imageUrl: "u" }] }, { from: -1 }, { count: 0 }]) {
      expect((await fetch(post("/api/admin/seed", body, ADMIN), mockEnv().env)).status).toBe(400);
    }
  });
});

describe("POST /api/embed-search", () => {
  it("validates the body", async () => {
    const { env } = mockEnv();
    for (const body of INVALID_SEARCHES) expect((await fetch(post("/api/embed-search", body), env)).status).toBe(400);
  });
  it("embeds the query with the BGE instruction and returns the nearest emoji", async () => {
    const { env, embedCalls } = await seeded();
    const res = await fetch(post("/api/embed-search", { query: "thumbs up", limit: 5 }), env);
    expect(res.status).toBe(200);
    expect(res.headers.get("server-timing")).toMatch(/embed;dur=\d+, vectorize;dur=\d+/);
    const body = (await res.json()) as any;
    expect(embedCalls.at(-1)!.text).toEqual(["Represent this sentence for searching relevant passages: thumbs up"]);
    expect(body.hits).toHaveLength(5);
    expect(body.hits.map((h: any) => h.unified)).toContain("1f44d");
    expect(body.hits[0].score).toBeGreaterThan(body.hits[4].score);
    expect(body).toMatchObject({ model: "@cf/baai/bge-large-en-v1.5", timings: { embedMs: expect.any(Number), queryMs: expect.any(Number) } });
  });
  it("includes custom emoji only when asked", async () => {
    const { env, queries } = await seeded();
    const without = (await (await fetch(post("/api/embed-search", { query: "rubber duck", limit: 10 }), env)).json()) as any;
    expect(without.hits.some((h: any) => h.custom)).toBe(false);
    expect(queries.at(-1)).toMatchObject({ topK: 50, returnMetadata: "all" });
    const withCustom = (await (await fetch(post("/api/embed-search", { query: "rubber duck", limit: 10, custom: true }), env)).json()) as any;
    expect(withCustom.hits[0]).toMatchObject({ unified: "rubber-duck", custom: true, imageUrl: expect.stringMatching(/^data:image\/svg/) });
    expect(queries.at(-1)).toMatchObject({ topK: 10 });
  });
  it("says so when the index hasn't been seeded", async () => {
    const res = await fetch(post("/api/embed-search", { query: "cat" }), mockEnv().env);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "unavailable", message: expect.stringMatching(/seed/) });
  });
  it("answers 503 when the bindings can't be reached (local dev without remote bindings)", async () => {
    const { env } = mockEnv();
    env.AI = { run: unreachable } as unknown as Ai;
    const res = await fetch(post("/api/embed-search", { query: "cat" }), env);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "unavailable", message: expect.stringMatching(/remotely/) });
  });
});

describe("POST /api/decide", () => {
  it("validates the body, model included", async () => {
    const { env } = mockEnv();
    for (const body of [...INVALID_SEARCHES.map((b) => ({ ...b, model: "clef" })), { query: "cat" }, { query: "cat", model: "gpt" }]) {
      expect((await fetch(post("/api/decide", body), env)).status).toBe(400);
    }
  });

  // Clef and Jev share the transport and the two-round ranking. Clef's schema also takes its
  // short model name, and its smaller per-request limit splits round 1 in two.
  describe.each([
    { model: "clef", id: "@cf/cloudflare/clef-flash", returned: "clef-flash", keys: ["model", "questions", "state"], requests: 3 },
    { model: "jev", id: "typesafe/jev", returned: "jev", keys: ["questions", "state"], requests: 2 },
  ])("$model", ({ model, id, returned, keys, requests }) => {
    it("runs the model on Workers AI through AI Gateway, with the model's request body", async () => {
      const { env, decideCalls } = mockEnv();
      await fetch(post("/api/decide", { query: "cat", model }), env);
      expect(decideCalls.length).toBeGreaterThan(0);
      for (const call of decideCalls) {
        expect(call.model).toBe(id);
        expect(call.options).toMatchObject({ gateway: { id: "default" } });
        expect(Object.keys(call.input).sort()).toEqual(keys);
      }
    });
    it("asks in two rounds: every name in <=255-option questions, then the finalists", async () => {
      const { env, decideCalls } = mockEnv();
      const res = await fetch(post("/api/decide", { query: "thumbs up", limit: 8, model }), env);
      expect(res.status).toBe(200);
      expect(res.headers.get("server-timing")).toMatch(/round1;dur=\d+, round2;dur=\d+/);
      expect(decideCalls).toHaveLength(requests);
      const inputs = decideCalls.map((c) => c.input);
      const round1 = inputs.slice(0, -1);
      const round2 = inputs.at(-1);
      expect(round1.every((r) => r.state === "thumbs up" && Object.keys(r.questions).length <= MAX_QUESTIONS)).toBe(true);
      const questions = round1.flatMap((r) => Object.values(r.questions));
      expect(questions).toHaveLength(Math.ceil(BUILT_IN.length / 250));
      expect(questions.reduce((n, q) => n + Object.keys(q.criteria).length, 0)).toBe(BUILT_IN.length);
      expect(Object.keys(round2!.questions.q0!.criteria).length).toBeLessThanOrEqual(MAX_OPTIONS);
      const body = (await res.json()) as any;
      expect(body.hits[0].unified).toBe("1f44d");
      expect(body.hits).toHaveLength(8);
      expect(body.timings).toEqual({ round1Ms: expect.any(Number), round2Ms: expect.any(Number) });
    });
    it("unwraps `result` and prices the tokens", async () => {
      const body = (await (await fetch(post("/api/decide", { query: "cat", model }), mockEnv().env)).json()) as any;
      const price = PRICES[id]!;
      expect(body.model).toBe(returned);
      expect(body.usage.requests).toBe(requests);
      expect(body.usage.inputTokens).toBeGreaterThan(0);
      expect(body.usage.costUsd).toBeCloseTo(body.usage.inputTokens * price.input + body.usage.outputTokens * price.output, 12);
    });
    it("offers custom emoji when asked", async () => {
      const { env, decideCalls } = mockEnv();
      const body = (await (await fetch(post("/api/decide", { query: "rubber duck", limit: 3, custom: true, model }), env)).json()) as any;
      expect(decideCalls.slice(0, -1).some((c) => Object.values(c.input.questions).some((q) => "rubber duck (custom)" in q.criteria))).toBe(true);
      expect(body.hits[0]).toMatchObject({ unified: "rubber-duck", custom: true, imageUrl: expect.stringMatching(/^data:image\/svg/) });
    });
  });

  it("uses CLEF_MODEL and JEV_MODEL", async () => {
    const { env, decideCalls } = mockEnv({ CLEF_MODEL: "@cf/cloudflare/clef" });
    const body = (await (await fetch(post("/api/decide", { query: "cat", model: "clef" }), env)).json()) as any;
    expect(decideCalls.every((c) => c.model === "@cf/cloudflare/clef")).toBe(true);
    expect(body.usage.costUsd).toBeCloseTo((body.usage.inputTokens + body.usage.outputTokens) * PRICES["@cf/cloudflare/clef"]!.input, 12);
  });
  it("answers 503 when the binding can't be reached (local dev without remote bindings)", async () => {
    const { env } = mockEnv();
    env.AI = { run: unreachable } as unknown as Ai;
    const res = await fetch(post("/api/decide", { query: "cat", model: "jev" }), env);
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ error: "unavailable", message: expect.stringMatching(/remotely/) });
  });
  it("answers 502 when the model returns no answers", async () => {
    const { env } = mockEnv();
    env.AI = { run: async () => ({ answers: {} }) } as unknown as Ai;
    expect((await fetch(post("/api/decide", { query: "cat", model: "clef" }), env)).status).toBe(502);
  });
});

describe("decision helpers", () => {
  it("labels are unique", () => {
    const labels = labelOptions([...BUILT_IN, ...CUSTOM, { id: "x", name: "thumbs up", shortcodes: [], tags: [] }]);
    expect(labels.size).toBe(BUILT_IN.length + CUSTOM.length + 1);
    expect(labels.get("thumbs up (2)")?.id).toBe("x");
  });
  it("packs questions under the token budget and the question limit", () => {
    const questions = chunk(Array.from({ length: 1000 }, (_, i) => `option number ${i}`), 250);
    expect(pack(questions, 1_000_000)).toHaveLength(1);
    expect(pack(questions, 3000)).toHaveLength(4);
    expect(pack(chunk(Array.from({ length: 100 }, (_, i) => `${i}`), 1), 1_000_000).map((r) => r.length)).toEqual([MAX_QUESTIONS, 100 - MAX_QUESTIONS]);
  });
});

describe("GET /api/health", () => {
  it("404s other paths", async () => {
    expect((await fetch(post("/api/clef", { query: "cat" }), mockEnv().env)).status).toBe(404);
  });
  it("reports what's configured", async () => {
    const { env } = await seeded();
    const body = (await (await fetch(new Request("https://w.dev/api/health", { headers: { origin: "http://localhost:5199" } }), env)).json()) as any;
    expect(body).toMatchObject({
      corpus: BUILT_IN.length + CUSTOM.length,
      embed: { model: "@cf/baai/bge-large-en-v1.5", vectors: BUILT_IN.length + CUSTOM.length },
      decide: { gateway: "default", clef: "@cf/cloudflare/clef-flash", jev: "typesafe/jev" },
    });
  });
});
