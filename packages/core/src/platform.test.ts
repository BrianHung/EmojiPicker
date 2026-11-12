import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DATA_LOCALES, dataLocale, localeData, twemojiUrl } from "./platform";

describe("platform", () => {
  it("names Twemoji files like Twemoji does", () => {
    expect(twemojiUrl("2764-fe0f", "/t/")).toBe("/t/2764.svg");
    expect(twemojiUrl("1f3f3-fe0f-200d-1f308", "/t/")).toBe("/t/1f3f3-fe0f-200d-1f308.svg");
  });

  it("points localeData at the data package, or at your own copy", () => {
    expect(localeData("ja")).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@emoji-components\/data@[^/]+\/data\/ja\/iamcal\.json$/);
    expect(localeData("ja-JP", { shortcodes: "cldr", baseUrl: "/emoji" })).toBe("/emoji/ja/cldr.json");
  });

  it("matches a locale to the nearest data folder", () => {
    const cases: [string, string][] = [
      ["en-US", "en"],
      ["en-GB", "en-gb"],
      ["es-MX", "es-mx"],
      ["es-419", "es-mx"],
      ["es-ES", "es"],
      ["pt-BR", "pt"],
      ["ja-JP", "ja"],
      ["zh-TW", "zh-hant"],
      ["zh-HK", "zh-hant"],
      ["zh-MO", "zh-hant"],
      ["zh-Hant", "zh-hant"],
      ["zh-Hant-SG", "zh-hant"],
      ["zh-CN", "zh"],
      ["zh-Hans-HK", "zh"],
      ["no", "nb"],
      ["nn-NO", "nb"],
      ["nb-NO", "nb"],
      ["tlh", "en"],
      ["not a locale", "en"],
    ];
    expect(cases.map(([locale]) => [locale, dataLocale(locale)])).toEqual(cases);
  });

  it("lists the data package's folders", () => {
    expect([...DATA_LOCALES]).toEqual(readdirSync(new URL("../../data/data", import.meta.url)).sort());
  });
});
