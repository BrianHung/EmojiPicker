import { describe, expect, it } from "vitest";
import data from "../data/en.json";
import { expandDataset, type Dataset } from "../src/core/dataset";
import { toEprData } from "../src/react/adapter";
import { PARKED, collapseEngineInput, setCategoryCollapsed, toggleCategoryCollapsed } from "../src/react/collapse";

const records = expandDataset(data as unknown as Dataset);
const epr = toEprData(records, [], { suggested: "Frequently used", custom: "Custom" });

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

describe("collapseEngineInput", () => {
  it("leaves the data alone when nothing it holds is collapsed", () => {
    const out = collapseEngineInput(epr, new Set(["suggested"]), []);
    expect(out.data).toBe(epr);
    expect(out.hideSuggested).toBe(true);
    expect(out.hiddenCustoms).toEqual([]);
  });

  it("empties collapsed groups but keeps their emoji resolvable", () => {
    const out = collapseEngineInput(epr, new Set(["smileys_people", "flags"]), []);
    expect(out.data.emojis.smileys_people).toEqual([]);
    expect(out.data.emojis.flags).toEqual([]);
    // Untouched groups keep their identity, so the engine doesn't re-render them.
    expect(out.data.emojis.animals_nature).toBe(epr.emojis.animals_nature);
    // Parked under a key no section renders, so frequents still resolve.
    expect(out.data.emojis[PARKED]).toHaveLength(epr.emojis.smileys_people!.length + epr.emojis.flags!.length);
    expect(out.hideSuggested).toBe(false);
    // The input is not mutated.
    expect(epr.emojis.smileys_people!.length).toBeGreaterThan(0);
  });

  it("hides custom emoji of collapsed custom sections", () => {
    const customs = [{ id: "lgtm" }, { id: "party_parrot", group: "parrots" }, { id: "shipit", group: "work" }];
    expect(collapseEngineInput(epr, new Set(["custom"]), customs).hiddenCustoms).toEqual(["lgtm"]);
    expect(collapseEngineInput(epr, new Set(["custom:parrots"]), customs).hiddenCustoms).toEqual(["party_parrot"]);
  });
});
