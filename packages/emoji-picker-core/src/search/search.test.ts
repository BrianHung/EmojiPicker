import { describe, expect, it } from "vitest";
import data from "../../data/en.json";
import { expandDataset, unifiedToNative, type Dataset } from "../dataset";
import { fallback, interimOf, lexical, merge, preferFrequent, progressive, remote, rerank, type EmojiSearch, type SearchContext } from "./search";

const records = expandDataset(data as unknown as Dataset);
const context = (overrides: Partial<SearchContext> = {}): SearchContext => ({ records, limit: 20, signal: new AbortController().signal, frequency: () => 0, ...overrides });
const glyphs = (hits: readonly { unified: string }[]) => hits.map((h) => unifiedToNative(h.unified));
const run = (search: EmojiSearch, q: string, ctx = context()) => search(q, ctx) as readonly { unified: string }[];

describe("lexical", () => {
  it("ranks whole names and shortcodes first", () => {
    expect(glyphs(run(lexical(), "fire"))[0]).toBe("🔥");
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
    expect(glyphs(run(lexical(), "skul"))[0]).toBe("💀");
  });

  it("takes a tokenizer or a segmenter", () => {
    const ja = expandDataset({ format: 1, locale: "ja", emojibase: "test", groups: [], emojis: [["1f604", "にっこり笑う顔", [], [], 0, 1, 0]], toneExceptions: {} });
    const ctx = context({ records: ja, locale: "ja" });
    const bigrams = (text: string) => Array.from({ length: Math.max(1, text.length - 1) }, (_, i) => text.slice(i, i + 2));
    expect(lexical({ tokenize: bigrams })("笑う", ctx)).toEqual([{ unified: "1f604" }]);
    expect(lexical({ segmenter: false })("笑う", ctx)).toEqual([]);
    expect(lexical({ segmenter: { segment: (text) => text.split("").map((segment) => ({ segment, isWordLike: true })) } })("笑", ctx)).toEqual([{ unified: "1f604" }]);
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
});
