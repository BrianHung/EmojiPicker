import { afterEach, describe, expect, it, vi } from "vitest";
import data from "../data/en.json";
import { expandDataset, unifiedToNative, withTone, type Dataset } from "../src/core/dataset";
import { createFrequencyStore, memoryStorage } from "../src/core/frequents";
import { needsTwemoji, twemojiUrl } from "../src/core/platform";
import { createSearchIndex } from "../src/core/search-index";
import { nameWithTone, replaceShortcodes, toneOf } from "../src/core/shortcodes";
import { createEmojiStore } from "../src/core/store";

const dataset = data as unknown as Dataset;
const records = expandDataset(dataset);
const index = createSearchIndex(records);
const native = (q: string, limit?: number) => index.search(q, limit).map((r) => r.emoji);

describe("dataset", () => {
  it("computes skin tones like emojibase", () => {
    expect(withTone("1f44d", 1)).toBe("1f44d-1f3fb");
    expect(withTone("26f9-fe0f-200d-2642-fe0f", 5)).toBe("26f9-1f3ff-200d-2642-fe0f");
    const thumbs = records.find((r) => r.name === "thumbs up")!;
    expect(thumbs.tones).toHaveLength(5);
    expect(thumbs.tones[2]).toBe("1f44d-1f3fd");
  });

  it("converts code points safely (custom ids are not code points)", () => {
    expect(unifiedToNative("1f44d-1f3fd")).toBe("👍🏽");
    expect(unifiedToNative("lgtm")).toBe("");
    expect(unifiedToNative("")).toBe("");
  });

  it("keeps two-person tone exceptions", () => {
    const kiss = records.find((r) => r.name === "kiss: woman, man")!;
    expect(kiss.tones[0]).toBe("1f469-1f3fb-200d-2764-fe0f-200d-1f48b-200d-1f468-1f3fb");
  });

  it("has Slack shortcodes, matched without FE0F", () => {
    expect(records.find((r) => r.emoji === "❤️")?.shortcodes).toContain("heart");
    expect(records.find((r) => r.emoji === "👍")?.shortcodes).toEqual(["+1", "thumbsup"]);
  });
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

  it("completes like Slack: words inside shortcodes, with match ranges", () => {
    const smiling = index.completeShortcode("smiling", 20);
    const codes = smiling.map((c) => c.shortcode);
    expect(codes).toContain("smiling_imp");
    expect(codes).toContain("slightly_smiling_face");
    expect(codes.indexOf("smiling_imp")).toBeLessThan(codes.indexOf("slightly_smiling_face"));
    expect(smiling.find((c) => c.shortcode === "slightly_smiling_face")?.match).toEqual([9, 16]);
    expect(index.completeShortcode("smiling_f").every((c) => c.shortcode.startsWith("smiling_f"))).toBe(true);
  });

  it("completes like Discord in alphabetical order: prefixes A–Z, then the rest A–Z", () => {
    const codes = index.completeShortcode("smi", 14, "alphabetical").map((c) => c.shortcode);
    expect(codes.slice(0, 5)).toEqual(["smile", "smile_cat", "smiley", "smiley_cat", "smiling_face_with_3_hearts"]);
    const prefixed = codes.filter((c) => c.startsWith("smi"));
    expect(codes.slice(0, prefixed.length)).toEqual(prefixed);
    const rest = codes.slice(prefixed.length);
    expect(rest).toEqual([...rest].sort());
    expect(rest[0]).toBe("blush");
    // An exact match still comes first.
    expect(index.completeShortcode("smile", 8, "alphabetical")[0]!.shortcode).toBe("smile");
  });
});

describe("shortcodes", () => {
  it("replaces Slack shortcodes, including :skin-tone-N:", () => {
    expect(replaceShortcodes(":thumbsup::skin-tone-3: ok :nope: :heart:", index)).toBe("👍🏼 ok :nope: ❤️");
    expect(replaceShortcodes(":heart::skin-tone-4:", index)).toBe("❤️"); // no tones: suffix dropped
  });

  it("reads the tone of a variation and names it", () => {
    expect(toneOf("1f44d-1f3fe")).toBe(4);
    expect(toneOf("1f44d")).toBe(0);
    expect(nameWithTone("thumbs up", "1f44d-1f3fe")).toBe("thumbs up: medium-dark skin tone");
    expect(nameWithTone("thumbs up", "1f44d")).toBe("thumbs up");
  });
});

describe("frequency store", () => {
  afterEach(() => vi.useRealTimers());

  it("ranks by decayed count, filling with defaults", () => {
    vi.useFakeTimers({ now: 0 });
    const store = createFrequencyStore({ storage: memoryStorage(), defaults: ["a", "b", "c"], halfLifeDays: 1 });
    expect(store.top(2)).toEqual(["a", "b"]);
    store.record("old");
    store.record("old");
    store.record("old");
    vi.setSystemTime(3 * 864e5); // 3 half-lives: 3 → 0.375
    store.record("new");
    expect(store.top(3)).toEqual(["new", "old", "a"]);
  });

  it("returns stable snapshots per n until something changes", () => {
    const store = createFrequencyStore({ storage: memoryStorage() });
    const five = store.top(5);
    expect(store.top(16)).not.toBe(five);
    expect(store.top(5)).toBe(five);
    store.record("1f525");
    expect(store.top(5)).not.toBe(five);
  });

  it("persists through its storage", () => {
    const storage = memoryStorage();
    createFrequencyStore({ storage }).record("1f525");
    expect(createFrequencyStore({ storage }).top(1)).toEqual(["1f525"]);
  });
});

describe("store", () => {
  it("loads lazily and resolves selections with tone and shortcode", async () => {
    const store = createEmojiStore({
      data: async () => dataset,
      frequents: createFrequencyStore({ storage: memoryStorage() }),
      customEmojis: [{ id: "parrot", name: "party parrot", imageUrl: "/parrot.gif", shortcodes: ["partyparrot"] }],
    });
    expect(store.search("thumbs")).toEqual([]);
    await store.load();
    const pick = store.select("1f44d-1f3fd")!;
    expect(pick).toMatchObject({ emoji: "👍🏽", baseUnified: "1f44d", skinTone: 3, shortcode: ":+1::skin-tone-4:", isCustom: false });
    expect(store.frequents.top(1)).toEqual(["1f44d"]);
    expect(store.search("partyparrot")[0]?.imageUrl).toBe("/parrot.gif");
    expect(store.select("parrot")).toMatchObject({ emoji: "", isCustom: true });
  });
});

describe("platform", () => {
  it("names Twemoji files like Twemoji does", () => {
    expect(twemojiUrl("2764-fe0f", "/t/")).toBe("/t/2764.svg");
    expect(twemojiUrl("1f3f3-fe0f-200d-1f308", "/t/")).toBe("/t/1f3f3-fe0f-200d-1f308.svg");
  });

  it("is false on the server", () => {
    expect(needsTwemoji()).toBe(false);
  });
});
