import { afterEach, describe, expect, it, vi } from "vitest";
import data from "../data/en.json";
import type { CustomEmoji } from "./custom";
import type { Dataset, DatasetEmoji, EmojiRecord } from "./dataset";
import { memoryStorage } from "./frequents";
import { defaultLabels } from "./labels";
import { interimOf, lexical, progressive, remote } from "./search/search";
import { createEmojiStore, type EmojiStoreOptions } from "./store";

const dataset = data as unknown as Dataset;
const frog = (id: string, extra: Partial<CustomEmoji> = {}): CustomEmoji => ({ id, name: id, imageUrl: `/frogs/${id}.png`, ...extra });
const storeWith = (customEmojis: EmojiStoreOptions["customEmojis"]) => createEmojiStore({ data: dataset, customEmojis, frequentsStorage: null });
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
      frequentsStorage: null,
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
    const store = createEmojiStore({ data: dataset, defaultFrequents, frequentsStorage: null });
    expect(store.frequent(3)).not.toContain("parrot");
    expect(store.frequent(3)).toHaveLength(3);
    expect(store.frequent(3)).toBe(store.frequent(3));
  });

  it("persists an uncontrolled skin tone and only reports a controlled one", () => {
    const skinToneStorage = memoryStorage();
    const own = createEmojiStore({ data: dataset, skinToneStorage });
    own.setSkinTone(3);
    expect(createEmojiStore({ data: dataset, skinToneStorage }).skinTone()).toBe(3);

    const onSkinToneChange = vi.fn();
    const controlled = createEmojiStore({ data: dataset, skinTone: 2, onSkinToneChange, skinToneStorage });
    controlled.setSkinTone(5);
    expect(controlled.skinTone()).toBe(2);
    expect(onSkinToneChange).toHaveBeenCalledWith(5);
    controlled.controlSkinTone(5, onSkinToneChange);
    expect(controlled.skinTone()).toBe(5);
    expect(skinToneStorage.read()).toBe("3");
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

  it("merges pack loading into the status, and keeps working without a failed pack", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: 500, statusText: "Server Error" })),
    );
    const store = storeWith([async () => [frog("lily")], "/broken-pack.json"]);
    const loading = store.load();
    expect(store.status()).toBe("loading");
    await loading;
    expect(store.status()).toBe("ready");
    expect(store.get("lily")?.imageUrl).toBe("/frogs/lily.png");
    expect(store.packErrors()).toHaveLength(1);
    expect(store.customEmojis().map((c) => c.id)).toEqual(["lily"]);
  });

  it("keeps size and animation fields on the record", async () => {
    const store = storeWith(frog("dance", { animated: true, stillUrl: "/frogs/dance-still.png", width: 128, height: 64 }));
    await store.load();
    expect(store.get("dance")).toMatchObject({ animated: true, stillUrl: "/frogs/dance-still.png", width: 128, height: 64 });
  });
});

describe("store locale", () => {
  it("takes the dataset's locale for search", async () => {
    const store = createEmojiStore({ data: tiny("tr", [["1faa1", "iğne"]]), frequentsStorage: null });
    await store.load();
    expect(store.locale()).toBe("tr");
    expect((store.query("İĞNE") as readonly { emoji: string }[]).map((r) => r.emoji)).toEqual(["🪡"]);
  });

  it("sets collation and counts from the locale; labels passed replace only themselves", async () => {
    const sv = tiny("sv", [
      ["1f600", "a", ["sz"]],
      ["1f601", "b", ["så"]],
      ["1f602", "c", ["sa"]],
    ]);
    const alphabetical = (store: ReturnType<typeof createEmojiStore>) => store.completeShortcode("s", 8, "alphabetical").map((c) => c.shortcode);
    const swedish = createEmojiStore({ data: sv, frequentsStorage: null });
    await swedish.load();
    expect(alphabetical(swedish)).toEqual(["sa", "sz", "så"]);
    expect(swedish.labels().resultCount(1234)).toBe(`${new Intl.NumberFormat("sv").format(1234)} results`);

    const mixed = createEmojiStore({ data: sv, frequentsStorage: null, locale: "en", labels: { searchPlaceholder: "Sök" } });
    await mixed.load();
    expect(alphabetical(mixed)).toEqual(["sa", "så", "sz"]);
    expect(mixed.labels()).toMatchObject({ searchPlaceholder: "Sök", searchLabel: defaultLabels.searchLabel });
    expect(mixed.labels().resultCount(1234)).toBe("1,234 results");
  });
});

describe("store.query", () => {
  it("uses the configured search, includes custom emoji, and resolves records", async () => {
    const store = createEmojiStore({
      data: dataset,
      customEmojis: [{ id: "shipit", name: "shipit", shortcodes: ["shipit"], tags: ["squirrel"], imageUrl: "/shipit.png" }],
      frequentsStorage: null,
      searchEngine: remote(async (q, { records }) => records.filter((r) => r.name.includes(q)).map((r) => r.unified)),
    });
    await store.load();
    expect((await store.query("shipit")).map((r) => r.unified)).toEqual(["shipit"]);
    expect(store.query("   ")).toEqual([]);
  });

  it("returns interim records for a progressive search", async () => {
    const store = createEmojiStore({
      data: dataset,
      frequentsStorage: null,
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
    const store = createEmojiStore({ data: dataset, frequentsStorage: null });
    await store.load();
    const out = store.query("fire");
    expect(Array.isArray(out)).toBe(true);
    expect((out as { emoji: string }[])[0]!.emoji).toBe("🔥");
  });
});

describe("store options", () => {
  it("is ready at once for an in-memory dataset", () => {
    const store = createEmojiStore({ data: dataset, frequentsStorage: null });
    expect(store.status()).toBe("ready");
    expect(store.get("1f44d")?.emoji).toBe("👍");
  });

  it("swaps data in place, keeping skin tone and frequents, and the old data while new data loads", async () => {
    const store = createEmojiStore({ data: tiny("en", [["1f600", "grinning"]]), frequentsStorage: null, skinToneStorage: memoryStorage() });
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
    const store = createEmojiStore({ data: dataset, frequentsStorage: null });
    const before = store.getSnapshot().data;
    store.setOptions({ data: dataset, filter: () => true });
    expect(store.getSnapshot().data).toBe(before);
    store.setOptions({ data: dataset, filter: (r) => r.group !== "flags" });
    expect(store.records().some((r) => r.group === "flags")).toBe(false);
  });
});
