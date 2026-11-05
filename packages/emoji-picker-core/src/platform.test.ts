import { describe, expect, it } from "vitest";
import { needsTwemoji } from "./native";
import { twemojiUrl } from "./platform";

describe("platform", () => {
  it("names Twemoji files like Twemoji does", () => {
    expect(twemojiUrl("2764-fe0f", "/t/")).toBe("/t/2764.svg");
    expect(twemojiUrl("1f3f3-fe0f-200d-1f308", "/t/")).toBe("/t/1f3f3-fe0f-200d-1f308.svg");
  });

  it("is false on the server", () => {
    expect(needsTwemoji()).toBe(false);
  });
});
