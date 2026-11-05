import { describe, expect, it } from "vitest";
import { setCategoryCollapsed } from "./picker";

describe("collapse state", () => {
  it("toggles ids in and out", () => {
    const one = setCategoryCollapsed([], "flags");
    expect(one).toEqual(["flags"]);
    expect(setCategoryCollapsed(one, "symbols")).toEqual(["flags", "symbols"]);
    expect(setCategoryCollapsed(one, "flags")).toEqual([]);
  });

  it("returns the same array when nothing changes", () => {
    const ids = ["flags"];
    expect(setCategoryCollapsed(ids, "flags", true)).toBe(ids);
    expect(setCategoryCollapsed(ids, "objects", false)).toBe(ids);
  });
});
