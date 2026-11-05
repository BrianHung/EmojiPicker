import { describe, expect, it } from "vitest";
import data from "../../data/en.json";
import { buildDataset } from "../../scripts/build-data";
import { expandDataset, type Dataset, type DatasetEmoji } from "../dataset";
import { createSearchIndex } from "./search-index";

const index = createSearchIndex(expandDataset(data as unknown as Dataset), { locale: "en" });
const glyphs = (records: readonly { emoji: string }[]) => records.map((r) => r.emoji);
const native = (q: string, limit?: number) => glyphs(index.search(q, limit));
const localized = (locale: string) => createSearchIndex(expandDataset(buildDataset({ locale }).dataset), { locale });
const tiny = (locale: string, emojis: [unified: string, name: string, shortcodes?: string[]][]): Dataset => ({
  format: 1,
  locale,
  emojibase: "test",
  groups: [],
  emojis: emojis.map(([unified, name, shortcodes = []]): DatasetEmoji => [unified, name, [], shortcodes, 0, 1, 0]),
  toneExceptions: {},
});

describe("search index", () => {
  it("matches shortcodes, names and tags", () => {
    expect(native("thumbsup")[0]).toBe("👍");
    expect(native("thu", 2)).toEqual(["👍", "👎"]);
    expect(native("heart eyes")[0]).toBe("😍");
    expect(native("+1")[0]).toBe("👍");
  });

  it("ANDs words and treats only the last as a prefix", () => {
    expect(native("face wit").length).toBeGreaterThan(10);
    expect(native("zzzzzz")).toEqual([]);
    expect(native("")).toEqual([]);
  });

  it("looks up and completes shortcodes", () => {
    expect(index.byShortcode(":thumbsup:")?.emoji).toBe("👍");
    expect(index.byShortcode("heart")?.emoji).toBe("❤️");
    const smile = index.completeShortcode("smile").map((c) => c.shortcode);
    expect(smile[0]).toBe("smile");
    expect(smile).toContain("smiley");
  });

  it("completes words inside shortcodes, with match ranges", () => {
    const smiling = index.completeShortcode("smiling", 20);
    const codes = smiling.map((c) => c.shortcode);
    expect(codes).toContain("smiling_imp");
    expect(codes).toContain("slightly_smiling_face");
    expect(codes.indexOf("smiling_imp")).toBeLessThan(codes.indexOf("slightly_smiling_face"));
    expect(smiling.find((c) => c.shortcode === "slightly_smiling_face")?.match).toEqual([9, 16]);
    expect(index.completeShortcode("smiling_f").every((c) => c.shortcode.startsWith("smiling_f"))).toBe(true);
  });

  it("orders completions alphabetically: prefixes A–Z, then the rest A–Z, an exact match first", () => {
    const codes = index.completeShortcode("smi", 14, "alphabetical").map((c) => c.shortcode);
    expect(codes.slice(0, 5)).toEqual(["smile", "smile_cat", "smiley", "smiley_cat", "smiling_face_with_3_hearts"]);
    const prefixed = codes.filter((c) => c.startsWith("smi"));
    expect(codes.slice(0, prefixed.length)).toEqual(prefixed);
    const rest = codes.slice(prefixed.length);
    expect(rest).toEqual([...rest].sort());
    expect(rest[0]).toBe("blush");
    expect(index.completeShortcode("smile", 8, "alphabetical")[0]!.shortcode).toBe("smile");
  });

  it("finds words in Japanese, Chinese and Thai text without spaces", () => {
    const ja = localized("ja");
    expect(glyphs(ja.search("笑顔"))).toContain("😄");
    expect(glyphs(ja.search("大泣き"))).toEqual(["😭"]);
    expect(glyphs(ja.search("泣"))).toContain("😢");
    const zh = localized("zh");
    expect(glyphs(zh.search("笑脸"))).toContain("😃");
    expect(glyphs(zh.search("哭"))).toEqual(expect.arrayContaining(["😭", "😢", "😂"]));
    expect(glyphs(zh.search("放声大哭"))).toEqual(["😭"]);
    const th = localized("th");
    expect(glyphs(th.search("ร้องไห้"))).toContain("😭");
    expect(glyphs(th.search("หน้ายิ้ม"))[0]).toBe("😀");
  });

  it("normalizes full-width and half-width input (NFKC)", () => {
    expect(native("ｆｉｒｅ")[0]).toBe("🔥");
    expect(index.completeShortcode("ｔａｄａ")[0]?.shortcode).toBe("tada");
    expect(glyphs(localized("ja").search("ｻﾑｽﾞｱｯﾌﾟ"))).toEqual(["👍"]);
  });

  it("lowercases and collates in the data's locale", () => {
    const tr = createSearchIndex(expandDataset(tiny("tr", [["1faa1", "iğne"]])), { locale: "tr" });
    expect(glyphs(tr.search("İĞNE"))).toEqual(["🪡"]);
    const records = expandDataset(
      tiny("sv", [
        ["1f600", "a", ["sz"]],
        ["1f601", "b", ["så"]],
        ["1f602", "c", ["sa"]],
      ]),
    );
    const order = (locale: string) =>
      createSearchIndex(records, { locale })
        .completeShortcode("s", 8, "alphabetical")
        .map((c) => c.shortcode);
    expect(order("sv")).toEqual(["sa", "sz", "så"]);
    expect(order("en")).toEqual(["sa", "så", "sz"]);
  });
});
