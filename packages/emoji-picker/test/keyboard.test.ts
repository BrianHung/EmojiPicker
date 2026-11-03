import { describe, expect, it } from "vitest";
import { moveByRows, rowsPerPage, type Point } from "../src/react/grid-nav";
import { DEFAULT_KEYMAP, actionFor, engineActionOf, isTextEditingKey, matchesChord, parseChord, resolveKeymap } from "../src/react/keymap";
import { columnsPerPage, layoutStrip, pageInStrip, type StripMetrics } from "../src/react/strip-layout";

const key = (k: string, mods: { ctrl?: boolean; meta?: boolean; alt?: boolean; shift?: boolean } = {}) => ({
  key: k,
  ctrlKey: !!mods.ctrl,
  metaKey: !!mods.meta,
  altKey: !!mods.alt,
  shiftKey: !!mods.shift,
});

describe("keymap", () => {
  it("resolves the default bindings", () => {
    expect(actionFor(key("ArrowDown"), DEFAULT_KEYMAP)).toBe("move-down");
    expect(actionFor(key("PageUp"), DEFAULT_KEYMAP)).toBe("page-up");
    expect(actionFor(key("Home"), DEFAULT_KEYMAP)).toBe("first");
    expect(actionFor(key("End", { ctrl: true }), DEFAULT_KEYMAP)).toBe("last");
    expect(actionFor(key("Enter"), DEFAULT_KEYMAP)).toBe("select");
    expect(actionFor(key("Escape"), DEFAULT_KEYMAP)).toBe("close");
    expect(actionFor(key("/"), DEFAULT_KEYMAP)).toBe("focus-search");
    expect(DEFAULT_KEYMAP["toggle-skin-tone"]).toEqual([]);
  });

  it("matches modifiers exactly", () => {
    expect(actionFor(key("ArrowDown", { shift: true }), DEFAULT_KEYMAP)).toBeNull();
    expect(actionFor(key("Enter", { meta: true }), DEFAULT_KEYMAP)).toBeNull();
    expect(actionFor(key("Home", { alt: true }), DEFAULT_KEYMAP)).toBeNull();
  });

  it("replaces whole actions; an empty list unbinds", () => {
    const keymap = resolveKeymap({ "move-down": ["j"], select: [] });
    expect(actionFor(key("j"), keymap)).toBe("move-down");
    expect(actionFor(key("J", { shift: true }), keymap)).toBeNull(); // Shift wasn't written for a letter
    expect(actionFor(key("ArrowDown"), keymap)).toBeNull();
    expect(actionFor(key("Enter"), keymap)).toBeNull();
    expect(keymap["move-up"]).toEqual(["ArrowUp"]);
    expect(resolveKeymap()).toBe(DEFAULT_KEYMAP);
  });

  it("reads Mod as ⌘ on Apple platforms and Ctrl elsewhere", () => {
    expect(matchesChord(key("Enter", { meta: true }), "Mod+Enter", true)).toBe(true);
    expect(matchesChord(key("Enter", { ctrl: true }), "Mod+Enter", true)).toBe(false);
    expect(matchesChord(key("Enter", { ctrl: true }), "Mod+Enter", false)).toBe(true);
    expect(matchesChord(key("k", { ctrl: true, shift: true }), "Ctrl+Shift+K", false)).toBe(true);
  });

  it("parses symbol keys, '+' and modifier aliases", () => {
    expect(parseChord("Ctrl++", false)).toMatchObject({ key: "+", ctrl: true, shift: null });
    expect(parseChord("+", false)).toMatchObject({ key: "+" });
    expect(parseChord("Cmd+Option+ArrowUp", false)).toMatchObject({ key: "ArrowUp", meta: true, alt: true, shift: false });
    // "?" needs Shift on most layouts: it matches with or without it unless written.
    expect(matchesChord(key("?", { shift: true }), "?")).toBe(true);
    expect(matchesChord(key("?", { shift: true }), "Shift+?")).toBe(true);
    expect(() => parseChord("Hyper+K")).toThrow(/unknown modifier/);
  });

  it("knows which keys the engine acts on and which a text field keeps", () => {
    expect(engineActionOf(key("ArrowLeft"))).toBe("move-left");
    expect(engineActionOf(key("Enter"))).toBe("select");
    expect(engineActionOf(key("ArrowLeft", { shift: true }))).toBeNull();
    expect(engineActionOf(key("PageDown"))).toBeNull();
    expect(isTextEditingKey(key("j"))).toBe(true);
    expect(isTextEditingKey(key("Home"))).toBe(true);
    expect(isTextEditingKey(key("Home", { ctrl: true }))).toBe(false);
    expect(isTextEditingKey(key("PageDown"))).toBe(false);
    expect(isTextEditingKey(key("ArrowDown"))).toBe(false);
  });
});

describe("page size", () => {
  it("fits whole rows under the sticky title, at least one", () => {
    expect(rowsPerPage(259, 40, 40)).toBe(5);
    expect(rowsPerPage(400, 40)).toBe(10);
    expect(rowsPerPage(30, 40)).toBe(1);
    expect(rowsPerPage(300, 0)).toBe(1);
  });

  it("counts whole columns in the strip's viewport", () => {
    const metrics: StripMetrics = { rows: 5, cellWidth: 46, cellHeight: 38, headerHeight: 20, padding: 3, sectionGap: 14, sectionMinWidth: 0 };
    const layout = layoutStrip([{ id: "a", count: 100 }], metrics);
    expect(columnsPerPage(layout, 402)).toBe(8);
    expect(columnsPerPage(layout, 10)).toBe(1);
  });
});

describe("paging the strip", () => {
  const metrics: StripMetrics = { rows: 2, cellWidth: 10, cellHeight: 10, headerHeight: 0, padding: 0, sectionGap: 0, sectionMinWidth: 0 };
  // a: columns [0,1] [2,3] [4,5]; b: [6] (one emoji); c: [7,8] [9,10]
  const layout = layoutStrip(
    [
      { id: "a", count: 6 },
      { id: "b", count: 1 },
      { id: "c", count: 4 },
    ],
    metrics,
  );

  it("moves a page of columns along the row, across sections", () => {
    expect(pageInStrip(layout, 0, 1, 2)).toBe(4);
    expect(pageInStrip(layout, 1, 1, 3)).toBe(6); // row 1 → the one-emoji section's only cell
    expect(pageInStrip(layout, 4, 1, 2)).toBe(7);
  });

  it("stops at the ends, and reports no move there", () => {
    expect(pageInStrip(layout, 7, 1, 10)).toBe(9);
    expect(pageInStrip(layout, 9, 1, 3)).toBeNull();
    expect(pageInStrip(layout, 0, -1, 3)).toBeNull();
    expect(pageInStrip(layout, 9, -1, 100)).toBe(0);
  });
});

describe("moving by rows (grouped results)", () => {
  // Two sections: three cells, then a title gap, then two cells.
  const points: Point[] = [
    { x: 0, y: 0 },
    { x: 40, y: 0 },
    { x: 80, y: 0 },
    { x: 0, y: 40 },
    { x: 0, y: 120 },
    { x: 40, y: 120 },
  ];

  it("goes to the next row in that direction, keeping the column", () => {
    expect(moveByRows(points, 1, 1)).toBe(3); // nearest column in a shorter row
    expect(moveByRows(points, 3, 1)).toBe(4); // across the section title
    expect(moveByRows(points, 5, -1)).toBe(3);
    expect(moveByRows(points, 5, -2)).toBe(1);
  });

  it("lands on the last row for a long page, and stays put at the edge", () => {
    expect(moveByRows(points, 0, 10)).toBe(4);
    expect(moveByRows(points, 4, 1)).toBeNull();
    expect(moveByRows(points, 0, -1)).toBeNull();
  });
});
