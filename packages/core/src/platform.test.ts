import { describe, expect, it } from "vitest";
import { localeData, twemojiUrl } from "./platform";

describe("platform", () => {
  it("names Twemoji files like Twemoji does", () => {
    expect(twemojiUrl("2764-fe0f", "/t/")).toBe("/t/2764.svg");
    expect(twemojiUrl("1f3f3-fe0f-200d-1f308", "/t/")).toBe("/t/1f3f3-fe0f-200d-1f308.svg");
  });

  it("points localeData at the data package, or at your own copy", () => {
    expect(localeData("ja")).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@brianhung\/emoji-picker-data@[^/]+\/data\/ja\/iamcal\.json$/);
    expect(localeData("ja", { shortcodes: "cldr", baseUrl: "/emoji" })).toBe("/emoji/ja/cldr.json");
  });
});
