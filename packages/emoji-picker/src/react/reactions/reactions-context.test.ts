import { describe, expect, it } from "vitest";
import { withoutTone } from "@brianhung/emoji-picker-core";
import { isPressed } from "./reactions-context";

describe("tapback selected reactions", () => {
  it("match in any skin tone, either side", () => {
    const selected = new Set(["2764-fe0f", "1f44d-1f3fd"].map(withoutTone));
    expect(isPressed(selected, "1f44d")).toBe(true);
    expect(isPressed(selected, "1F44D-1F3FB")).toBe(true);
    expect(isPressed(selected, "2764-fe0f")).toBe(true);
    expect(isPressed(selected, "1f44e")).toBe(false);
  });
});
