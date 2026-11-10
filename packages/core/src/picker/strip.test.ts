import { describe, expect, it } from "vitest";
import { columnsPerPage, layoutStrip, moveInStrip, placeCell, sectionOf, type StripMetrics } from "./strip";

const IOS: StripMetrics = { rows: 5, cellWidth: 46, cellHeight: 38.4, headerHeight: 19.6, padding: 2.9, sectionGap: 13.8, sectionMinWidth: 150 };
const strip = layoutStrip(
  [
    { id: "frequent", count: 30 },
    { id: "empty", count: 0 },
    { id: "smileys", count: 12 },
    { id: "short", count: 2 },
  ],
  IOS,
);

describe("layoutStrip", () => {
  it("places sections side by side and skips empty ones", () => {
    expect(strip.sections.map((s) => s.id)).toEqual(["frequent", "smileys", "short"]);
    const [a, b, c] = strip.sections;
    expect(a).toMatchObject({ start: 0, count: 30, columns: 6, x: 2.9, width: 276 });
    expect(b!.x).toBeCloseTo(2.9 + 276 + 13.8);
    expect(b).toMatchObject({ start: 30, columns: 3, width: 150 });
    expect(c).toMatchObject({ start: 42, columns: 1, width: 150 });
    expect(strip.total).toBe(44);
    expect(strip.width).toBeCloseTo(c!.x + 150 + 2.9);
    expect(strip.height).toBeCloseTo(19.6 + 5 * 38.4);
  });

  it("is empty with no items", () => {
    const empty = layoutStrip([{ id: "a", count: 0 }], IOS);
    expect(empty.sections).toEqual([]);
    expect(empty.width).toBe(0);
    expect(moveInStrip(empty, 0, "right")).toBeNull();
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
    expect(moveInStrip(strip, 6, "down")).toBe(7);
    expect(moveInStrip(strip, 6, "up")).toBe(5);
    expect(moveInStrip(strip, 5, "up")).toBeNull();
    expect(moveInStrip(strip, 9, "down")).toBeNull();
    expect(moveInStrip(strip, 41, "down")).toBeNull();
  });

  it("moves sideways along a row and across sections", () => {
    expect(moveInStrip(strip, 2, "right")).toBe(7);
    expect(moveInStrip(strip, 7, "left")).toBe(2);
    expect(moveInStrip(strip, 28, "right")).toBe(33);
    expect(moveInStrip(strip, 33, "left")).toBe(28);
    expect(moveInStrip(strip, 39, "right")).toBe(43);
    expect(moveInStrip(strip, 43, "left")).toBe(41);
    expect(moveInStrip(strip, 0, "left")).toBeNull();
    expect(moveInStrip(strip, 43, "right")).toBeNull();
  });

  it("goes to the ends with Home and End", () => {
    expect(moveInStrip(strip, 20, "first")).toBe(0);
    expect(moveInStrip(strip, 20, "last")).toBe(43);
    expect(moveInStrip(strip, 0, "first")).toBeNull();
  });
});

describe("columnsPerPage", () => {
  it("counts whole columns in the strip's viewport", () => {
    const metrics: StripMetrics = { rows: 5, cellWidth: 46, cellHeight: 38, headerHeight: 20, padding: 3, sectionGap: 14, sectionMinWidth: 0 };
    const layout = layoutStrip([{ id: "a", count: 100 }], metrics);
    expect(columnsPerPage(layout, 402)).toBe(8);
    expect(columnsPerPage(layout, 10)).toBe(1);
  });
});

describe("paging a strip", () => {
  const metrics: StripMetrics = { rows: 2, cellWidth: 10, cellHeight: 10, headerHeight: 0, padding: 0, sectionGap: 0, sectionMinWidth: 0 };
  const layout = layoutStrip(
    [
      { id: "a", count: 6 },
      { id: "b", count: 1 },
      { id: "c", count: 4 },
    ],
    metrics,
  );

  it("moves a page of columns along the row, across sections", () => {
    expect(moveInStrip(layout, 0, "page-down", 2)).toBe(4);
    expect(moveInStrip(layout, 1, "page-down", 3)).toBe(6);
    expect(moveInStrip(layout, 4, "page-down", 2)).toBe(7);
  });

  it("stops at the ends, and reports no move there", () => {
    expect(moveInStrip(layout, 7, "page-down", 10)).toBe(9);
    expect(moveInStrip(layout, 9, "page-down", 3)).toBeNull();
    expect(moveInStrip(layout, 0, "page-up", 3)).toBeNull();
    expect(moveInStrip(layout, 9, "page-up", 100)).toBe(0);
  });
});
