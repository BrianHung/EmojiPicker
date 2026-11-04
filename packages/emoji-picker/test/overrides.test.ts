import { describe, expect, it } from "vitest";
import { findArtwork } from "../src/react/overrides";
import { isPressed, reactionKey } from "../src/react/reactions-context";

describe("artwork overrides", () => {
  const map = { "2764-fe0f": "/heart.svg", "1f44d": "/thumbs.svg", "1f44d-1f3ff": "/thumbs-dark.svg", "203c": "/bang.svg" };

  it("matches the exact code first", () => {
    expect(findArtwork(map, "2764-fe0f")).toBe("/heart.svg");
    expect(findArtwork(map, "1f44d-1f3ff")).toBe("/thumbs-dark.svg");
  });

  it("covers every skin tone of a base key, unless a toned key is given", () => {
    expect(findArtwork(map, "1f44d-1f3fb")).toBe("/thumbs.svg");
    expect(findArtwork(map, "1F44D")).toBe("/thumbs.svg");
  });

  it("matches with and without U+FE0F either way", () => {
    expect(findArtwork(map, "2764")).toBe("/heart.svg");
    expect(findArtwork(map, "203c-fe0f")).toBe("/bang.svg");
  });

  it("leaves other emoji alone", () => {
    expect(findArtwork(map, "1f44e")).toBeUndefined();
    expect(findArtwork({}, "1f44d")).toBeUndefined();
  });
});

describe("tapback selected reactions", () => {
  it("match in any skin tone, either side", () => {
    const selected = new Set(["2764-fe0f", "1f44d-1f3fd"].map(reactionKey));
    expect(isPressed(selected, "1f44d")).toBe(true);
    expect(isPressed(selected, "1F44D-1F3FB")).toBe(true);
    expect(isPressed(selected, "2764-fe0f")).toBe(true);
    expect(isPressed(selected, "1f44e")).toBe(false);
  });
});
