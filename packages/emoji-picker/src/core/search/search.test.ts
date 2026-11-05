import { describe, expect, it } from "vitest";
import data from "../../../data/en.json";
import { expandDataset, unifiedToNative, type Dataset } from "../dataset";
import { createFrequencyStore, memoryStorage } from "../frequents";
import { fallback, fuse, interimOf, lexical, merge, preferFrequent, progressive, remote, rerank, type EmojiSearch, type SearchContext } from "./search";
import { createEmojiStore } from "../store";

const records = expandDataset(data as unknown as Dataset);
const context = (overrides: Partial<SearchContext> = {}): SearchContext => ({ records, limit: 20, signal: new AbortController().signal, frequency: () => 0, ...overrides });
const glyphs = (hits: readonly { unified: string }[]) => hits.map((h) => unifiedToNative(h.unified));
const run = (search: EmojiSearch, q: string, ctx = context()) => search(q, ctx) as readonly { unified: string }[];

describe("lexical", () => {
  it("ranks whole names and shortcodes first", () => {
    expect(glyphs(run(lexical(), "fire"))[0]).toBe("🔥");
    expect(glyphs(run(lexical(), "thumbsup"))[0]).toBe("👍");
    expect(glyphs(run(lexical(), "tada"))[0]).toBe("🎉");
  });

  it("corrects typos only when the exact search comes up short", () => {
    expect(glyphs(run(lexical(), "rokcet"))[0]).toBe("🚀");
    expect(glyphs(run(lexical(), "pizzza"))[0]).toBe("🍕");
    expect(glyphs(run(lexical(), "thumsb up"))[0]).toBe("👍");
    expect(glyphs(run(lexical(), "hart"))[0]).toBe("❤️");
    expect(run(lexical({ typos: false }), "rokcet")).toEqual([]);
  });

  it("keeps partial words as prefixes, not typos", () => {
    expect(glyphs(run(lexical(), "thu")).slice(0, 2)).toEqual(["👍", "👎"]);
    expect(glyphs(run(lexical(), "skul"))[0]).toBe("💀");
  });
});

describe("composition", () => {
  const only =
    (...codes: string[]): EmojiSearch =>
    () =>
      codes.map((unified) => ({ unified }));
  const later =
    (...codes: string[]): EmojiSearch =>
    () =>
      Promise.resolve(codes.map((unified) => ({ unified })));

  it("fallback fills in only below the threshold, without duplicates", () => {
    expect(run(fallback(only("1f525"), only("1f680", "1f525"), { min: 2 }), "x").map((h) => h.unified)).toEqual(["1f525", "1f680"]);
    expect(run(fallback(only("1f525", "1f44d"), only("1f680"), { min: 2 }), "x").map((h) => h.unified)).toEqual(["1f525", "1f44d"]);
  });

  it("stays synchronous when every part is, and awaits when one is async", async () => {
    const sync = fallback(only("1f525"), only("1f680"));
    expect(Array.isArray(sync("x", context()))).toBe(true);
    const mixed = fallback(only("1f525"), later("1f680"));
    const out = mixed("x", context());
    expect(Array.isArray(out)).toBe(false);
    expect((await out).map((h) => h.unified)).toEqual(["1f525", "1f680"]);
  });

  it("progressive shows the fast results at once and the slow ones when they arrive", async () => {
    const out = progressive(only("1f525"), later("1f680", "1f525"))("x", context());
    expect(interimOf(out)?.map((h) => h.unified)).toEqual(["1f525"]);
    expect((await out).map((h) => h.unified)).toEqual(["1f680", "1f525"]);
  });

  it("progressive keeps the fast results when the slow search fails, and passes a sync slow one through", async () => {
    const failing: EmojiSearch = () => Promise.reject(new Error("offline"));
    expect((await progressive(only("1f525"), failing)("x", context())).map((h) => h.unified)).toEqual(["1f525"]);
    const aborted = new AbortController();
    aborted.abort();
    await expect(progressive(only("1f525"), failing)("x", context({ signal: aborted.signal }))).rejects.toThrow("offline");
    expect(run(progressive(only("1f525"), only("1f680")), "x").map((h) => h.unified)).toEqual(["1f680"]);
  });

  it("rerank keeps interim results flowing", async () => {
    const reversed = rerank(progressive(only("1f525", "1f680"), later("1f44d", "1f389")), (hits) => [...hits].reverse());
    const out = reversed("x", context());
    expect(interimOf(out)?.map((h) => h.unified)).toEqual(["1f680", "1f525"]);
    expect((await out).map((h) => h.unified)).toEqual(["1f389", "1f44d"]);
  });

  it("merge fuses rankings: agreement wins", () => {
    const out = run(merge(only("a", "b", "c"), only("b", "a", "d")), "x").map((h) => h.unified);
    expect(out.slice(0, 2).sort()).toEqual(["a", "b"]);
    expect(out).toContain("d");
  });

  it("preferFrequent moves a heavily used emoji up", () => {
    const frequency = (u: string) => (u === "1f9ef" ? 50 : 0);
    const plain = glyphs(run(lexical(), "fire", context({ frequency })));
    const boosted = glyphs(run(rerank(lexical(), preferFrequent({ weight: 0.9 })), "fire", context({ frequency })));
    expect(boosted.indexOf("🧯")).toBeLessThan(plain.indexOf("🧯"));
  });

  it("remote accepts plain codes or hits", async () => {
    const search = remote(async () => ["1f525", { unified: "1f680", score: 0.5 }]);
    expect((await search("x", context())).map((h) => h.unified)).toEqual(["1f525", "1f680"]);
  });

  it("fuse adapts any Fuse-shaped constructor", () => {
    class FakeFuse<T> {
      constructor(private docs: T[]) {}
      search(q: string) {
        return (this.docs as unknown as { unified: string; name: string }[]).filter((d) => d.name.includes(q)).map((item) => ({ item, score: 0 }));
      }
    }
    expect(glyphs(run(fuse(FakeFuse as never), "rocket"))[0]).toBe("🚀");
  });
});

describe("store.query", () => {
  it("uses the configured search, includes custom emoji, and resolves records", async () => {
    const store = createEmojiStore({
      data: data as unknown as Dataset,
      customEmojis: [{ id: "shipit", name: "shipit", shortcodes: ["shipit"], tags: ["squirrel"], imageUrl: "/shipit.png" }],
      frequents: createFrequencyStore({ storage: memoryStorage() }),
      searchEngine: remote(async (q, { records }) => records.filter((r) => r.name.includes(q)).map((r) => r.unified)),
    });
    await store.load();
    const out = await store.query("shipit");
    expect(out.map((r) => r.unified)).toEqual(["shipit"]);
    expect(store.query("   ")).toEqual([]);
  });

  it("returns interim records for a progressive search", async () => {
    const store = createEmojiStore({
      data: data as unknown as Dataset,
      frequents: createFrequencyStore({ storage: memoryStorage() }),
      searchEngine: progressive(
        lexical(),
        remote(async () => ["1f680"]),
      ),
    });
    await store.load();
    const out = store.query("fire");
    expect(interimOf(out)?.[0]?.emoji).toBe("🔥");
    expect((await out).map((r) => r.emoji)).toEqual(["🚀"]);
  });

  it("defaults to lexical, synchronously", async () => {
    const store = createEmojiStore({ data: data as unknown as Dataset, frequents: createFrequencyStore({ storage: memoryStorage() }) });
    await store.load();
    const out = store.query("fire");
    expect(Array.isArray(out)).toBe(true);
    expect((out as { emoji: string }[])[0]!.emoji).toBe("🔥");
  });
});
