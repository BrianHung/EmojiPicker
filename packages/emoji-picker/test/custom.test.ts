import { afterEach, describe, expect, it, vi } from "vitest";
import data from "../data/en.json";
import type { Dataset } from "../src/core/dataset";
import { customRecords, loadCustomEmojis, splitWords, type CustomEmoji } from "../src/core/custom";
import { createFrequencyStore, memoryStorage } from "../src/core/frequents";
import { createEmojiStore, type EmojiStoreOptions } from "../src/core/store";

const frog = (id: string, extra: Partial<CustomEmoji> = {}): CustomEmoji => ({ id, name: id, imageUrl: `/frogs/${id}.png`, ...extra });
const storeWith = (customEmojis: EmojiStoreOptions["customEmojis"]) =>
  createEmojiStore({ data: data as unknown as Dataset, customEmojis, frequents: createFrequencyStore({ storage: memoryStorage() }) });

afterEach(() => vi.unstubAllGlobals());

describe("custom emoji", () => {
  it("splits ids into words: camelCase, snake_case, kebab-case, acronyms", () => {
    expect(splitWords("sleepyFrogFamily")).toEqual(["sleepy", "frog", "family"]);
    expect(splitWords("frog_bread-time")).toEqual(["frog", "bread", "time"]);
    expect(splitWords("HTTPError2")).toEqual(["http", "error2"]);
  });

  it("indexes id words and inherits a base emoji's name and tags", () => {
    const bread = { unified: "1f35e", name: "bread", tags: ["loaf"], shortcodes: [], emoji: "🍞", group: "food_drink" as const, version: 0.6, tones: [], order: 0 };
    const [record] = customRecords([frog("frogBreadParty", { name: "Frog bread party", base: "1f35e" })], 100, (u) => (u === "1f35e" ? bread : undefined));
    expect(record).toMatchObject({ unified: "frogBreadParty", order: 100, group: "custom" });
    expect(record!.tags).toContain("loaf");
    expect(record!.tags).not.toContain("frog"); // a name word already
  });

  it("finds custom emoji by id words and by their base", async () => {
    const store = storeWith([frog("sleepyFrogFamily", { name: "sleepy", shortcodes: ["sleepyfrog"] }), frog("froge-toast", { name: "toasty", base: "1f35e" })]);
    await store.load();
    expect(store.search("frog family").map((r) => r.unified)).toContain("sleepyFrogFamily");
    expect(store.search("bread").map((r) => r.unified)).toContain("froge-toast");
    expect(store.customGroups().has("sleepyFrogFamily")).toBe(true);
  });

  it("loads packs from loaders and URLs in parallel, keeps the first of a repeated id, and skips a failed pack", async () => {
    const fetchMock = vi.fn(async (url: string) =>
      url === "/good.json" ? new Response(JSON.stringify([frog("a"), frog("b")])) : new Response("nope", { status: 404, statusText: "Not Found" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { emojis, errors } = await loadCustomEmojis([frog("a", { name: "first a" }), "/good.json", "/missing.json", async () => [frog("c")]], new AbortController().signal);
    expect(emojis.map((e) => [e.id, e.name])).toEqual([["a", "first a"], ["b", "b"], ["c", "c"]]);
    expect(errors).toHaveLength(1);
    expect(errors[0]!.message).toMatch(/404/);
  });

  it("merges pack loading into the store's status, and keeps working without a failed pack", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("", { status: 500, statusText: "Server Error" })));
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
