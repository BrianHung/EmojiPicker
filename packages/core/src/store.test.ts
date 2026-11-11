import { afterEach, describe, expect, it, vi } from "vitest";
import { en } from "../test/en";
import type { CustomEmoji } from "./custom";
import type { Dataset, DatasetEmoji, EmojiRecord } from "./dataset";
import { defaultLabels } from "./labels";
import { createEmojiSearch } from "./search/query";
import { createEmojiStore, type EmojiStoreOptions } from "./store";

const dataset = en;
const frog = (id: string, extra: Partial<CustomEmoji> = {}): CustomEmoji => ({ id, name: id, imageUrl: `/frogs/${id}.png`, ...extra });
const storeWith = (customEmojis: EmojiStoreOptions["customEmojis"]) => createEmojiStore({ data: dataset, customEmojis });
const tiny = (locale: string, emojis: [unified: string, name: string, shortcodes?: string[]][]): Dataset => ({
  format: 1,
  locale,
  emojibase: "test",
  groups: [],
  emojis: emojis.map(([unified, name, shortcodes = []]): DatasetEmoji => [unified, name, [], shortcodes, 0, 1, 0]),
  toneExceptions: {},
});

afterEach(() => vi.unstubAllGlobals());

describe("store", () => {
  it("loads lazily and resolves selections with tone and shortcode", async () => {
    const store = createEmojiStore({
      data: async () => dataset,
      customEmojis: [{ id: "parrot", name: "party parrot", imageUrl: "/parrot.gif", shortcodes: ["partyparrot"] }],
    });
    expect(store.query("thumbs")).toEqual([]);
    await store.load();
    const pick = store.select("1f44d-1f3fd")!;
    expect(pick).toMatchObject({ emoji: "👍🏽", baseUnified: "1f44d", skinTone: 3, shortcode: ":+1::skin-tone-4:", isCustom: false });
    expect(store.frequents.top(1)).toEqual(["1f44d"]);
    expect((store.query("partyparrot") as EmojiRecord[])[0]?.imageUrl).toBe("/parrot.gif");
    expect(store.select("parrot")).toMatchObject({ emoji: "", isCustom: true });
  });

  it("skips frequent custom emoji the current sources no longer have, keeping the count", () => {
    const defaultFrequents = Object.fromEntries(["parrot", "1f44d", "1f525"].map((u) => [u, { count: 1, lastUsed: Date.now() }]));
    const store = createEmojiStore({ data: dataset, defaultFrequents });
    expect(store.frequent(3)).not.toContain("parrot");
    expect(store.frequent(3)).toEqual(["1f44d", "1f525"]);
    expect(store.frequent(3)).toBe(store.frequent(3));
  });

  it("persists an uncontrolled skin tone and only reports a controlled one", () => {
    const items = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (k: string) => items.get(k) ?? null, setItem: (k: string, v: string) => void items.set(k, v) } });
    createEmojiStore({ data: dataset }).setSkinTone(3);
    expect(createEmojiStore({ data: dataset }).skinTone()).toBe(3);

    const onSkinToneChange = vi.fn();
    const controlled = createEmojiStore({ data: dataset, skinTone: 2, onSkinToneChange });
    controlled.setSkinTone(5);
    expect(controlled.skinTone()).toBe(2);
    expect(onSkinToneChange).toHaveBeenCalledWith(5, expect.objectContaining({ reason: "none" }));
    controlled.setOptions({ data: dataset, skinTone: 5, onSkinToneChange });
    expect(controlled.skinTone()).toBe(5);
    expect(items.get("emoji-components:skin-tone")).toBe("3");
  });
});

describe("custom emoji in the store", () => {
  it("finds them by id words and by their base", async () => {
    const store = storeWith([frog("sleepyFrogFamily", { name: "sleepy", shortcodes: ["sleepyfrog"] }), frog("froge-toast", { name: "toasty", base: "1f35e" })]);
    await store.load();
    expect((store.query("frog family") as EmojiRecord[]).map((r) => r.unified)).toContain("sleepyFrogFamily");
    expect((store.query("bread") as EmojiRecord[]).map((r) => r.unified)).toContain("froge-toast");
    expect(store.customGroups().has("sleepyFrogFamily")).toBe(true);
  });

  it("merges a loader into the status, and keeps working when it fails", async () => {
    const store = storeWith(async () => [frog("lily")]);
    const loading = store.load();
    expect(store.status()).toBe("loading");
    await loading;
    expect([store.status(), store.get("lily")?.imageUrl]).toEqual(["ready", "/frogs/lily.png"]);
  });

  it("loads a failed loader again, keeping the dataset", async () => {
    let online = false;
    const failing = storeWith(async () => (online ? [frog("lily")] : Promise.reject(new Error("offline"))));
    await failing.load();
    expect([failing.status(), failing.customEmojiErrors()[0]?.message, failing.get("lily")]).toEqual(["ready", "offline", undefined]);
    const records = failing.records().length;
    online = true;
    await failing.load();
    expect([failing.status(), failing.customEmojiErrors(), failing.get("lily")?.imageUrl, failing.records().length]).toEqual(["ready", [], "/frogs/lily.png", records + 1]);
  });

  it("keeps size and animation fields on the record", async () => {
    const store = storeWith([frog("dance", { animated: true, stillUrl: "/frogs/dance-still.png", width: 128, height: 64 })]);
    await store.load();
    expect(store.get("dance")).toMatchObject({ animated: true, stillUrl: "/frogs/dance-still.png", width: 128, height: 64 });
  });
});

describe("store locale", () => {
  it("takes the dataset's locale for search", async () => {
    const store = createEmojiStore({ data: tiny("tr", [["1faa1", "iğne"]]) });
    await store.load();
    expect(store.locale()).toBe("tr");
    expect((store.query("İĞNE") as readonly { emoji: string }[]).map((r) => r.emoji)).toEqual(["🪡"]);
  });

  it("sets collation from the locale and keeps the English labels; labels passed replace only themselves", async () => {
    const sv = tiny("sv", [
      ["1f600", "a", ["sz"]],
      ["1f601", "b", ["så"]],
      ["1f602", "c", ["sa"]],
    ]);
    const alphabetical = (store: ReturnType<typeof createEmojiStore>) => store.completeShortcode("s", 8, "alphabetical").map((c) => c.shortcode);
    const swedish = createEmojiStore({ data: sv });
    await swedish.load();
    expect(alphabetical(swedish)).toEqual(["sa", "sz", "så"]);
    expect(swedish.labels().resultCount(1234)).toBe("1,234 results");

    const mixed = createEmojiStore({ data: sv, locale: "en", labels: { searchPlaceholder: "Sök" } });
    await mixed.load();
    expect(alphabetical(mixed)).toEqual(["sa", "så", "sz"]);
    expect(mixed.labels()).toMatchObject({ searchPlaceholder: "Sök", searchLabel: defaultLabels.searchLabel });
    expect(mixed.labels().resultCount(1234)).toBe("1,234 results");
  });

  it("loads the locale's dataset when no data is given, and another when the locale changes", async () => {
    const urls: string[] = [];
    vi.stubGlobal("fetch", async (url: string) => {
      urls.push(url);
      return new Response(JSON.stringify({ ...dataset, locale: url.split("/").at(-2) }));
    });
    const store = createEmojiStore({ locale: "ja-JP" });
    await store.load();
    store.setOptions({ locale: "pt-BR" });
    await store.load();
    expect(urls.map((u) => u.split("/").slice(-2).join("/"))).toEqual(["ja/iamcal.json", "pt/iamcal.json"]);
  });

  it("puts the emoji used most first among equal shortcode matches", async () => {
    const store = createEmojiStore({ data: dataset, frequents: { "1f389": { count: 2, lastUsed: Date.now() } } });
    await store.load();
    expect(store.completeShortcode("ta")[0]?.shortcode).toBe("tada");
    expect(store.completeShortcode("smile")[0]?.shortcode).toBe("smile");
  });
});

describe("store.query", () => {
  it("uses the configured search, includes custom emoji, and resolves records", async () => {
    const store = createEmojiStore({
      data: dataset,
      customEmojis: [{ id: "shipit", name: "shipit", shortcodes: ["shipit"], tags: ["squirrel"], imageUrl: "/shipit.png" }],
      search: async (q, { records }) => records.filter((r) => r.name.includes(q)).map((r) => ({ unified: r.unified })),
    });
    await store.load();
    expect((await store.query("shipit")).map((r) => r.unified)).toEqual(["shipit"]);
    expect(store.query("   ")).toEqual([]);
  });

  it("carries a rejected search as an error, and runs the same query again", async () => {
    let online = false;
    const store = createEmojiStore({ data: dataset, search: async (q, { records }) => (online ? records.filter((r) => r.name === q).map((r) => ({ unified: r.unified })) : Promise.reject(new Error("offline"))) });
    const search = createEmojiSearch(store, { query: "fire", limit: 5 });
    await vi.waitFor(() => expect(search.getSnapshot()).toMatchObject({ pending: false, results: [], error: { message: "offline" } }));
    online = true;
    search.setQuery("fire", 5);
    await vi.waitFor(() => expect(search.getSnapshot()).toMatchObject({ pending: false, results: [{ emoji: "🔥" }], error: null }));
  });

  it("defaults to lexicalSearch, synchronously", async () => {
    const store = createEmojiStore({ data: dataset });
    await store.load();
    const out = store.query("fire");
    expect(Array.isArray(out)).toBe(true);
    expect((out as { emoji: string }[])[0]!.emoji).toBe("🔥");
  });
});

describe("store options", () => {
  it("is ready at once for an in-memory dataset", () => {
    const store = createEmojiStore({ data: dataset });
    expect(store.status()).toBe("ready");
    expect(store.get("1f44d")?.emoji).toBe("👍");
  });

  it("swaps data in place, keeping skin tone and frequents, and the old data while new data loads", async () => {
    const store = createEmojiStore({ data: tiny("en", [["1f600", "grinning"]]) });
    store.setSkinTone(2);
    store.select("1f600");
    store.setOptions({ data: tiny("fr", [["1f600", "souriant"]]) });
    expect([store.get("1f600")?.name, store.locale(), store.skinTone(), store.frequents.top(1)]).toEqual(["souriant", "fr", 2, ["1f600"]]);
    store.setOptions({ data: async () => tiny("de", [["1f600", "grinsend"]]) });
    expect(store.get("1f600")?.name).toBe("souriant");
    await store.load();
    expect(store.get("1f600")?.name).toBe("grinsend");
  });

  it("re-filters without reloading, and ignores an equivalent filter", () => {
    const store = createEmojiStore({ data: dataset });
    const before = store.records();
    store.setOptions({ data: dataset, filter: () => true });
    expect(store.records()).toBe(before);
    store.setOptions({ data: dataset, filter: (r) => r.group !== "flags" });
    expect(store.records().some((r) => r.group === "flags")).toBe(false);
  });
});

describe("store recovery", () => {
  it("clears the error after a successful retry", async () => {
    let fail = true;
    const store = createEmojiStore({
      data: async () => {
        if (fail) throw new Error("offline");
        return dataset;
      },
    });
    await store.load().catch(() => {});
    expect(store.status()).toBe("error");
    fail = false;
    await store.load();
    expect(store.status()).toBe("ready");
    expect(store.error()).toBeNull();
  });

  it("remove() takes an emoji out of the frequent list", () => {
    const store = createEmojiStore({ data: dataset });
    store.frequents.pick("1f600");
    store.frequents.pick("1f44d");
    expect(store.frequent(16)).toContain("1f44d");
    store.frequents.remove("1f44d");
    expect(store.frequent(16)).not.toContain("1f44d");
  });
});
