import { describe, expect, it } from "vitest";
import { en } from "../test/en";
import { expandDataset, toDataset, unifiedToNative, withTone } from "./dataset";

const records = expandDataset(en);

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

  it("has iamcal shortcodes, matched without FE0F", () => {
    expect(records.find((r) => r.emoji === "❤️")?.shortcodes).toContain("heart");
    expect(records.find((r) => r.emoji === "👍")?.shortcodes).toEqual(["+1", "thumbsup"]);
  });

  it("normalizes the hand-written form", () => {
    const [heart, frog] = expandDataset(
      toDataset({
        locale: "en",
        groups: [{ id: "animals-nature", name: "Animals" }],
        emojis: [
          { emoji: "❤️", name: "heart", group: "smileys-people" },
          { unified: "1F438", name: "frog", tags: ["toad"], shortcodes: ["frog"], group: "animals-nature", version: 0.6 },
        ],
      }),
    );
    expect(heart).toMatchObject({ unified: "2764-fe0f", emoji: "❤️", group: "smileys-people", version: 0, tones: [] });
    expect(frog).toMatchObject({ unified: "1f438", emoji: "🐸", tags: ["toad"], shortcodes: ["frog"], group: "animals-nature", version: 0.6 });
  });
});
