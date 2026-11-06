import { describe, expect, it } from "vitest";
import { en } from "../test/en";
import { expandDataset } from "./dataset";
import { createSearchIndex } from "./search/search-index";
import { findShortcodeTrigger, isComposingKey, nameWithTone, replaceShortcodes, toneOf } from "./shortcodes";

const index = createSearchIndex(expandDataset(en));

describe("shortcodes", () => {
  it("triggers on a full-width colon after Hangul", () => {
    expect(findShortcodeTrigger("안녕：웃음")).not.toBeNull();
  });

  it("replaces shortcodes, including :skin-tone-N:, dropping a tone the emoji doesn't take", () => {
    expect(replaceShortcodes(":thumbsup::skin-tone-3: ok :nope: :heart:", index)).toBe("👍🏼 ok :nope: ❤️");
    expect(replaceShortcodes(":heart::skin-tone-4:", index)).toBe("❤️");
  });

  it("reads the tone of a variation and names it", () => {
    expect(toneOf("1f44d-1f3fe")).toBe(4);
    expect(toneOf("1f44d")).toBe(0);
    expect(nameWithTone("thumbs up", "1f44d-1f3fe")).toBe("thumbs up: medium-dark skin tone");
    expect(nameWithTone("thumbs up", "1f44d")).toBe("thumbs up");
    expect(nameWithTone("サムズアップ", "1f44d-1f3fd", (name, tone) => `${name}: 肌の色${tone}`)).toBe("サムズアップ: 肌の色3");
  });

  it("triggers after a space, a full-width colon, or a CJK character, and not inside times or emoticons", () => {
    expect(findShortcodeTrigger("ok :smi")).toEqual({ query: "smi", offset: 3 });
    expect(findShortcodeTrigger("今日は：わら")).toEqual({ query: "わら", offset: 3 });
    expect(findShortcodeTrigger("哈哈:笑")).toEqual({ query: "笑", offset: 2 });
    expect(findShortcodeTrigger("at 10:30")).toBeNull();
    expect(findShortcodeTrigger("hi :)")).toBeNull();
    expect(findShortcodeTrigger("hi :s")).toBeNull();
  });

  it("leaves keys to the IME while it composes", () => {
    expect(isComposingKey({ isComposing: true })).toBe(true);
    expect(isComposingKey({ keyCode: 229 })).toBe(true);
    expect(isComposingKey({ keyCode: 13 })).toBe(false);
  });
});
