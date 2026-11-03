import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import data from "../data/en.json";
import { buildDataset } from "../scripts/build-data";
import { expandDataset, type Dataset, type DatasetEmoji } from "../src/core/dataset";
import { createFrequencyStore, memoryStorage } from "../src/core/frequents";
import { defaultLabels, plural } from "../src/core/labels";
import { lexical, type SearchContext } from "../src/core/search";
import { createSearchIndex } from "../src/core/search-index";
import { nameWithTone } from "../src/core/shortcodes";
import { createEmojiStore } from "../src/core/store";
import { createTokenizer } from "../src/core/tokenize";

const localized = (locale: string) => createSearchIndex(expandDataset(buildDataset({ locale }).dataset), { locale });
const glyphs = (records: readonly { emoji: string }[]) => records.map((r) => r.emoji);
const dataset = (locale: string, emojis: [unified: string, name: string, shortcodes?: string[]][]): Dataset => ({
  format: 1,
  locale,
  emojibase: "test",
  groups: [],
  emojis: emojis.map(([unified, name, shortcodes = []]): DatasetEmoji => [unified, name, [], shortcodes, 0, 1, 0]),
  toneExceptions: {},
});

describe("search across scripts", () => {
  it("finds words in Japanese, Chinese and Thai text without spaces", () => {
    const ja = localized("ja");
    expect(glyphs(ja.search("笑顔"))).toContain("😄");
    expect(glyphs(ja.search("大泣き"))).toEqual(["😭"]);
    expect(glyphs(ja.search("泣"))).toContain("😢"); // a prefix of 泣き, 泣く

    const zh = localized("zh");
    expect(glyphs(zh.search("笑脸"))).toContain("😃");
    expect(glyphs(zh.search("哭"))).toEqual(expect.arrayContaining(["😭", "😢", "😂"]));
    expect(glyphs(zh.search("放声大哭"))).toEqual(["😭"]);

    const th = localized("th");
    expect(glyphs(th.search("ร้องไห้"))).toContain("😭");
    expect(glyphs(th.search("หน้ายิ้ม"))[0]).toBe("😀");
  });

  it("normalizes full-width and half-width input (NFKC)", () => {
    const en = createSearchIndex(expandDataset(data as unknown as Dataset), { locale: "en" });
    expect(glyphs(en.search("ｆｉｒｅ"))[0]).toBe("🔥");
    expect(en.completeShortcode("ｔａｄａ")[0]?.shortcode).toBe("tada");
    expect(glyphs(localized("ja").search("ｻﾑｽﾞｱｯﾌﾟ"))).toEqual(["👍"]);
  });

  it("lowercases in the data's locale", () => {
    expect(createTokenizer({ locale: "tr" })("İĞNE ILIK")).toEqual(["iğne", "ılık"]);
    expect(createTokenizer({ locale: "en" })("İĞNE")).not.toEqual(["iğne"]);
    const tr = createSearchIndex(expandDataset(dataset("tr", [["1faa1", "iğne"]])), { locale: "tr" });
    expect(glyphs(tr.search("İĞNE"))).toEqual(["🪡"]);
  });

  it("orders alphabetical completions by the locale's collation", () => {
    const records = expandDataset(dataset("sv", [["1f600", "a", ["sz"]], ["1f601", "b", ["så"]], ["1f602", "c", ["sa"]]]));
    const order = (locale: string) => createSearchIndex(records, { locale }).completeShortcode("s", 8, "alphabetical").map((c) => c.shortcode);
    expect(order("sv")).toEqual(["sa", "sz", "så"]);
    expect(order("en")).toEqual(["sa", "så", "sz"]);
  });

  it("takes the dataset's locale through the store, and a tokenizer or segmenter through lexical()", async () => {
    const store = createEmojiStore({ data: dataset("tr", [["1faa1", "iğne"]]), frequents: createFrequencyStore({ storage: memoryStorage() }) });
    await store.load();
    expect(store.locale()).toBe("tr");
    expect(glyphs(store.query("İĞNE") as readonly { emoji: string }[])).toEqual(["🪡"]);

    const records = expandDataset(dataset("ja", [["1f604", "にっこり笑う顔"]]));
    const context: SearchContext = { records, limit: 10, signal: new AbortController().signal, frequency: () => 0, locale: "ja" };
    const bigrams = (text: string) => Array.from({ length: Math.max(1, text.length - 1) }, (_, i) => text.slice(i, i + 2));
    expect(lexical({ tokenize: bigrams })("笑う", context)).toEqual([{ unified: "1f604" }]);
    expect(lexical({ segmenter: false })("笑う", context)).toEqual([]);
    expect(lexical({ segmenter: { segment: (text) => text.split("").map((segment) => ({ segment, isWordLike: true })) } })("笑", context)).toEqual([{ unified: "1f604" }]);
  });
});

describe("labels", () => {
  it("counts with plural rules and the locale's digits", () => {
    expect([0, 1, 2, 1234].map(defaultLabels.resultCount)).toEqual(["No results", "1 result", "2 results", "1,234 results"]);
    const ru = plural("ru", { one: "# результат", few: "# результата", many: "# результатов", other: "# результата" });
    expect([1, 3, 5, 21].map(ru)).toEqual(["1 результат", "3 результата", "5 результатов", "21 результат"]);
    expect(plural("de", { other: "# Ergebnisse" })(1234)).toBe("1.234 Ergebnisse");
  });

  it("names skin tone variations", () => {
    expect(nameWithTone("サムズアップ", "1f44d-1f3fd", (name, tone) => `${name}: 肌の色${tone}`)).toBe("サムズアップ: 肌の色3");
    expect(defaultLabels.skinTones).toHaveLength(6);
  });
});

describe("build-data", () => {
  it("writes a localized dataset", () => {
    const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "emoji-data-")), "ja.json");
    execFileSync(process.execPath, ["--import", "tsx", path.join(__dirname, "../scripts/cli.ts"), "build-data", "ja", "--out", out], { stdio: "pipe" });
    const ja = JSON.parse(fs.readFileSync(out, "utf8")) as Dataset;
    const en = data as unknown as Dataset;
    expect(ja).toMatchObject({ format: 1, locale: "ja", emojibase: en.emojibase });
    expect(ja.groups).toHaveLength(en.groups.length);
    expect(ja.groups[1]).toBe("動物と自然");
    expect(ja.emojis).toHaveLength(en.emojis.length);
    const thumbs = ja.emojis.find((e) => e[0] === "1f44d")!;
    expect(thumbs[1]).toBe("サムズアップ");
    expect(thumbs[3]).toEqual(["+1", "thumbsup", "samuzuappu"]); // Slack's first, then CLDR's
    fs.rmSync(path.dirname(out), { recursive: true });
  });
});
