import { describe, expect, it } from "vitest";
import { createTokenizer } from "./tokenize";

describe("tokenizer", () => {
  it("lowercases in its locale", () => {
    expect(createTokenizer({ locale: "tr" })("İĞNE ILIK")).toEqual(["iğne", "ılık"]);
    expect(createTokenizer({ locale: "en" })("İĞNE")).not.toEqual(["iğne"]);
  });
});
