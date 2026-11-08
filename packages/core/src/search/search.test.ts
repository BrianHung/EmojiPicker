import { describe, expect, it } from "vitest";
import { en } from "../../test/en";
import { expandDataset, unifiedToNative } from "../dataset";
import { lexicalSearch, type EmojiSearch, type SearchContext } from "./search";

const records = expandDataset(en);
const context = (overrides: Partial<SearchContext> = {}): SearchContext => ({ records, limit: 20, signal: new AbortController().signal, frequency: () => 0, ...overrides });
const glyphs = (hits: readonly { unified: string }[]) => hits.map((h) => unifiedToNative(h.unified));
const run = (search: EmojiSearch, q: string, ctx = context()) => search(q, ctx) as readonly { unified: string }[];

describe("lexical", () => {
  it("ranks whole names and shortcodes first", () => {
    expect(glyphs(run(lexicalSearch(), "fire"))[0]).toBe("🔥");
    expect(glyphs(run(lexicalSearch(), "tada"))[0]).toBe("🎉");
  });

  it("corrects typos only when the exact search comes up short", () => {
    expect(glyphs(run(lexicalSearch(), "rokcet"))[0]).toBe("🚀");
    expect(glyphs(run(lexicalSearch(), "pizzza"))[0]).toBe("🍕");
    expect(glyphs(run(lexicalSearch(), "thumsb up"))[0]).toBe("👍");
    expect(glyphs(run(lexicalSearch(), "hart"))[0]).toBe("❤️");
    expect(run(lexicalSearch({ typos: false }), "rokcet")).toEqual([]);
  });

  it("keeps partial words as prefixes, not typos", () => {
    expect(glyphs(run(lexicalSearch(), "skul"))[0]).toBe("💀");
  });

  it("takes a tokenizer or a segmenter", () => {
    const ja = expandDataset({ format: 1, locale: "ja", emojibase: "test", groups: [], emojis: [["1f604", "にっこり笑う顔", [], [], 0, 1, 0]], toneExceptions: {} });
    const ctx = context({ records: ja, locale: "ja" });
    const bigrams = (text: string) => Array.from({ length: Math.max(1, text.length - 1) }, (_, i) => text.slice(i, i + 2));
    expect(lexicalSearch({ tokenize: bigrams })("笑う", ctx)).toEqual([{ unified: "1f604" }]);
    expect(lexicalSearch({ segmenter: false })("笑う", ctx)).toEqual([]);
    expect(lexicalSearch({ segmenter: { segment: (text) => text.split("").map((segment) => ({ segment, isWordLike: true })) } })("笑", ctx)).toEqual([{ unified: "1f604" }]);
  });
});
