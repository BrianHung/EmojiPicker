import { afterEach, describe, expect, it, vi } from "vitest";
import { customRecords, loadCustomEmojis, splitWords, type CustomEmoji } from "./custom";

const frog = (id: string, extra: Partial<CustomEmoji> = {}): CustomEmoji => ({ id, name: id, imageUrl: `/frogs/${id}.png`, ...extra });

afterEach(() => vi.unstubAllGlobals());

describe("custom emoji", () => {
  it("splits ids into words: camelCase, snake_case, kebab-case, acronyms", () => {
    expect(splitWords("sleepyFrogFamily")).toEqual(["sleepy", "frog", "family"]);
    expect(splitWords("frog_bread-time")).toEqual(["frog", "bread", "time"]);
    expect(splitWords("HTTPError2")).toEqual(["http", "error2"]);
  });

  it("indexes id words not already in the name, and inherits a base emoji's tags", () => {
    const bread = { unified: "1f35e", name: "bread", tags: ["loaf"], shortcodes: [], emoji: "🍞", group: "food-drink" as const, version: 0.6, tones: [], order: 0 };
    const [record] = customRecords([frog("frogBreadParty", { name: "Frog bread party", base: "1f35e" })], 100, (u) => (u === "1f35e" ? bread : undefined));
    expect(record).toMatchObject({ unified: "frogBreadParty", order: 100, group: "custom" });
    expect(record!.tags).toContain("loaf");
    expect(record!.tags).not.toContain("frog");
  });

  it("keeps the first of a repeated id, and reports a failed loader", async () => {
    const signal = new AbortController().signal;
    const { emojis } = await loadCustomEmojis([frog("a", { name: "first a" }), frog("b"), frog("a")], signal);
    expect(emojis.map((e) => [e.id, e.name])).toEqual([
      ["a", "first a"],
      ["b", "b"],
    ]);
    const failed = await loadCustomEmojis(async () => Promise.reject(new Error("offline")), signal);
    expect([failed.emojis, failed.errors[0]?.message]).toEqual([[], "offline"]);
  });
});
