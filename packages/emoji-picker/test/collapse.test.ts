import { describe, expect, it } from "vitest";
import { setCategoryCollapsed, toggleCategoryCollapsed } from "../src/react/collapse";

describe("collapse state", () => {
  it("toggles ids in and out", () => {
    const one = toggleCategoryCollapsed([], "flags");
    expect(one).toEqual(["flags"]);
    expect(toggleCategoryCollapsed(one, "symbols")).toEqual(["flags", "symbols"]);
    expect(toggleCategoryCollapsed(one, "flags")).toEqual([]);
  });

  it("returns the same array when nothing changes", () => {
    const ids = ["flags"];
    expect(setCategoryCollapsed(ids, "flags", true)).toBe(ids);
    expect(setCategoryCollapsed(ids, "objects", false)).toBe(ids);
  });
});
