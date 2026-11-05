import { describe, expect, it } from "vitest";
import data from "../data/en.json";
import { nativeToUnified, type Dataset } from "./dataset";
import { missingEmojiText, resolveEmoji } from "./resolve";
import { createEmojiStore } from "./store";

const parrot = { id: "partyparrot", name: "Party parrot", imageUrl: "/parrot.gif", shortcodes: ["partyparrot"] };

async function loadedStore() {
  const store = createEmojiStore({ data: data as unknown as Dataset, customEmojis: [parrot] });
  await store.load();
  return store;
}

describe("resolveEmoji", () => {
  it("reads native emoji, keeping skin tone and ZWJ sequences", async () => {
    const store = await loadedStore();
    expect(resolveEmoji(store, "🎉")).toMatchObject({ unified: "1f389", name: "party popper", native: "🎉" });
    expect(resolveEmoji(store, "👍🏽")).toMatchObject({ unified: "1f44d-1f3fd", name: "thumbs up", native: "👍🏽" });
    expect(resolveEmoji(store, "👩‍💻")?.record?.name).toBe("woman technologist");
    expect(resolveEmoji(store, "❤")?.record?.unified).toBe("2764-fe0f");
    expect(resolveEmoji(store, "🇯🇵")?.record?.shortcodes).toContain("jp");
  });

  it("reads shortcodes with or without colons, Slack skin tones and custom emoji", async () => {
    const store = await loadedStore();
    expect(resolveEmoji(store, ":tada:")?.unified).toBe("1f389");
    expect(resolveEmoji(store, "tada")?.unified).toBe("1f389");
    expect(resolveEmoji(store, ":+1::skin-tone-4:")?.unified).toBe("1f44d-1f3fd");
    expect(resolveEmoji(store, ":partyparrot:")).toMatchObject({ unified: "partyparrot", imageUrl: "/parrot.gif", native: "" });
  });

  it("reads unified codes and custom ids", async () => {
    const store = await loadedStore();
    expect(resolveEmoji(store, "1f389")?.name).toBe("party popper");
    expect(resolveEmoji(store, "1F44D-1F3FD")?.unified).toBe("1f44d-1f3fd");
    expect(resolveEmoji(store, "partyparrot")?.imageUrl).toBe("/parrot.gif");
  });

  it("reads records, selections and unregistered custom emoji objects", async () => {
    const store = await loadedStore();
    const selection = store.select("1f44d-1f3fb")!;
    expect(resolveEmoji(store, selection)).toMatchObject({ unified: "1f44d-1f3fb", native: "👍🏻" });
    expect(resolveEmoji(store, store.get("1f389")!)?.native).toBe("🎉");
    const unregistered = { id: "lgtm", name: "LGTM", imageUrl: "/lgtm.png" };
    expect(resolveEmoji(store, unregistered)).toMatchObject({ unified: "lgtm", imageUrl: "/lgtm.png", record: undefined });
  });

  it("draws native emoji and unified codes before data loads, nothing else", () => {
    const store = createEmojiStore({ data: async () => data as unknown as Dataset });
    expect(resolveEmoji(store, "🎉")?.native).toBe("🎉");
    expect(resolveEmoji(store, "1f389")?.native).toBe("🎉");
    expect(resolveEmoji(store, ":tada:")).toBeNull();
  });

  it("returns null for unknown input, and the literal to show instead", async () => {
    const store = await loadedStore();
    expect(resolveEmoji(store, ":not_an_emoji:")).toBeNull();
    expect(resolveEmoji(store, "add")).toBeNull();
    expect(resolveEmoji(store, "")).toBeNull();
    expect(missingEmojiText("not_an_emoji")).toBe(":not_an_emoji:");
    expect(missingEmojiText(":nope:")).toBe(":nope:");
    expect(nativeToUnified("👍🏽")).toBe("1f44d-1f3fd");
  });
});
