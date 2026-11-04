import { describe, expect, it } from "vitest";
import data from "../data/en.json";
import { expandDataset, type Dataset } from "../src/core/dataset";
import { defaultLabels } from "../src/core/labels";
import { categorySections, itemFactory, resultSections } from "../src/core/sections";
import { layoutStrip, moveInStrip, placeCell, sectionOf, type StripMetrics } from "../src/react/strip-layout";

// The iOS 27 keyboard: 46 × 38.4 cells, 5 rows, sections 13.8 apart.
const IOS: StripMetrics = { rows: 5, cellWidth: 46, cellHeight: 38.4, headerHeight: 19.6, padding: 2.9, sectionGap: 13.8, sectionMinWidth: 150 };
const strip = layoutStrip(
  [
    { id: "suggested", count: 30 },
    { id: "empty", count: 0 },
    { id: "smileys", count: 12 },
    { id: "short", count: 2 },
  ],
  IOS,
);

describe("layoutStrip", () => {
  it("places sections side by side and skips empty ones", () => {
    expect(strip.sections.map((s) => s.id)).toEqual(["suggested", "smileys", "short"]);
    const [a, b, c] = strip.sections;
    expect(a).toMatchObject({ start: 0, count: 30, columns: 6, x: 2.9, width: 276 });
    expect(b!.x).toBeCloseTo(2.9 + 276 + 13.8);
    expect(b).toMatchObject({ start: 30, columns: 3, width: 150 }); // 3 columns = 138 < min width
    expect(c).toMatchObject({ start: 42, columns: 1, width: 150 });
    expect(strip.total).toBe(44);
    expect(strip.width).toBeCloseTo(c!.x + 150 + 2.9);
    expect(strip.height).toBeCloseTo(19.6 + 5 * 38.4);
  });

  it("is empty with no items", () => {
    const empty = layoutStrip([{ id: "a", count: 0 }], IOS);
    expect(empty.sections).toEqual([]);
    expect(empty.width).toBe(0);
    expect(moveInStrip(empty, 0, "ArrowRight")).toBeNull();
  });
});

describe("placeCell", () => {
  it("fills columns top to bottom", () => {
    expect(placeCell(strip, 0)).toMatchObject({ section: 0, column: 0, row: 0, x: 2.9 });
    expect(placeCell(strip, 4)).toMatchObject({ column: 0, row: 4 });
    expect(placeCell(strip, 5)).toMatchObject({ column: 1, row: 0, x: 2.9 + 46 });
    expect(placeCell(strip, 4)!.y).toBeCloseTo(19.6 + 4 * 38.4);
    const smileys = placeCell(strip, 36)!;
    expect(smileys).toMatchObject({ section: 1, column: 1, row: 1 });
    expect(smileys.x).toBeCloseTo(strip.sections[1]!.x + 46);
    expect(placeCell(strip, 44)).toBeNull();
    expect(sectionOf(strip, 41)).toBe(1);
    expect(sectionOf(strip, 42)).toBe(2);
  });
});

describe("moveInStrip", () => {
  it("moves up and down within a column", () => {
    expect(moveInStrip(strip, 6, "ArrowDown")).toBe(7);
    expect(moveInStrip(strip, 6, "ArrowUp")).toBe(5);
    expect(moveInStrip(strip, 5, "ArrowUp")).toBeNull();
    expect(moveInStrip(strip, 9, "ArrowDown")).toBeNull();
    // Last, partial column of smileys (items 40, 41).
    expect(moveInStrip(strip, 41, "ArrowDown")).toBeNull();
  });

  it("moves sideways along a row and across sections", () => {
    expect(moveInStrip(strip, 2, "ArrowRight")).toBe(7);
    expect(moveInStrip(strip, 7, "ArrowLeft")).toBe(2);
    // Last column of "suggested", row 3 → first column of smileys, row 3.
    expect(moveInStrip(strip, 28, "ArrowRight")).toBe(33);
    expect(moveInStrip(strip, 33, "ArrowLeft")).toBe(28);
    // Row 4 has no cell in smileys' last column: go on to the next section, clamped to its rows.
    expect(moveInStrip(strip, 39, "ArrowRight")).toBe(43);
    // Into a partial last column from the right keeps the closest row.
    expect(moveInStrip(strip, 43, "ArrowLeft")).toBe(41);
    expect(moveInStrip(strip, 0, "ArrowLeft")).toBeNull();
    expect(moveInStrip(strip, 43, "ArrowRight")).toBeNull();
  });

  it("goes to the ends with Home and End", () => {
    expect(moveInStrip(strip, 20, "Home")).toBe(0);
    expect(moveInStrip(strip, 20, "End")).toBe(43);
    expect(moveInStrip(strip, 0, "Home")).toBeNull();
  });
});

describe("sections", () => {
  const records = expandDataset(data as unknown as Dataset);
  const get = (u: string) => records.find((r) => r.unified === u || r.tones.includes(u));
  const categories = [
    { id: "suggested", name: "Frequently Used", nav: true },
    { id: "flags", name: "Flags", nav: true },
    { id: "smileys_people", name: "Smileys & People", nav: true },
  ];
  const item = itemFactory(defaultLabels);

  it("follows the picker's category order, with frequents first", () => {
    const out = categorySections({ categories, records, suggested: ["1f44d-1f3fd", "nope"], customGroup: () => undefined, collapsed: () => false, get, withSkinTone: (u) => u, item });
    expect(out.map((s) => s.id)).toEqual(["suggested", "flags", "smileys_people"]);
    expect(out[0]!.items.map((i) => i.unified)).toEqual(["1f44d-1f3fd"]);
    expect(out[0]!.items[0]!.record.unified).toBe("1f44d");
    expect(out[1]!.items.every((i) => i.record.group === "flags")).toBe(true);
  });

  it("skips empty sections, keeps a collapsed one's title, applies the skin tone and the version cap", () => {
    const out = categorySections({
      categories,
      records,
      suggested: [],
      customGroup: () => undefined,
      collapsed: (id) => id === "flags",
      emojiVersion: 12,
      get,
      withSkinTone: (u) => get(u)?.tones[2] ?? u,
      item,
    });
    expect(out.map((s) => [s.id, s.collapsed, s.items.length > 0])).toEqual([
      ["flags", true, false],
      ["smileys_people", false, true],
    ]);
    const items = out[1]!.items;
    expect(items.every((i) => i.record.version <= 12)).toBe(true);
    expect(items.find((i) => i.record.unified === "1f44b")!.unified).toBe("1f44b-1f3fd");
  });

  it("puts custom emoji in their group's section", () => {
    const custom = [
      { ...records[0]!, unified: "parrot", group: "custom" as const, imageUrl: "p.gif", version: 0 },
      { ...records[0]!, unified: "shipit", group: "custom" as const, imageUrl: "s.png", version: 0 },
    ];
    const out = categorySections({
      categories: [
        { id: "custom", name: "Custom", nav: true },
        { id: "custom:team", name: "Team", nav: true },
      ],
      records: [...records, ...custom],
      suggested: [],
      customGroup: (u) => (u === "shipit" ? "team" : undefined),
      collapsed: () => false,
      emojiVersion: 1,
      get,
      withSkinTone: (u) => `${u}!`,
      item,
    });
    expect(out.map((s) => [s.id, s.items.map((i) => i.unified)])).toEqual([
      ["custom", ["parrot"]],
      ["custom:team", ["shipit"]],
    ]);
  });

  it("lays out results as one section, or one per category", () => {
    const hits = ["1f1fa-1f1f8", "1f600", "1f1ef-1f1f5"].map((u) => get(u)!);
    const ranked = resultSections(hits, "ranked", (g) => g, (u) => u, item, "Results");
    expect(ranked).toHaveLength(1);
    expect(ranked[0]!.header).toBe(false);
    expect(ranked[0]!.items.map((i) => i.record)).toEqual(hits);
    const grouped = resultSections(hits, "grouped", (g) => g.toUpperCase(), (u) => u, item, "Results");
    expect(grouped.map((s) => [s.name, s.category, s.items.map((i) => hits.indexOf(i.record))])).toEqual([
      ["SMILEYS_PEOPLE", "smileys_people", [1]],
      ["FLAGS", "flags", [0, 2]],
    ]);
    // The same emoji in the same section and tone is the same object, render to render.
    expect(resultSections(hits, "ranked", (g) => g, (u) => u, item, "Results")[0]!.items[0]).toBe(ranked[0]!.items[0]);
  });
});
