import { describe, expect, it } from "vitest";
import { createEmojiGrid, moveInGrid, rowsPerPage } from "../../core/grid";
import { DEFAULT_KEYMAP, actionFor, isTextEditingKey, matchesChord, parseChord, resolveKeymap } from "./keymap";
import { columnsPerPage, layoutStrip, pageInStrip, type StripMetrics } from "../list/strip-layout";

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
    expect(actionFor(key(" "), DEFAULT_KEYMAP)).toBe("select");
    // Shift+Space isn't an action: it opens an emoji's skin-tone variations.
    expect(actionFor(key(" ", { shift: true }), DEFAULT_KEYMAP)).toBeNull();
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

  it("knows which keys a text field keeps", () => {
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

describe("the grid's rows", () => {
  const section = (id: string, n: number, header = true) => ({ id, header, items: Array.from({ length: n }, (_, i) => ({ id: `${id}${i}` })) });
  // a: [a0 a1 a2] [a3]   b: [b0 b1 b2] [b3 b4]
  const grid = createEmojiGrid([section("a", 4), section("b", 5)], { columns: 3, rowHeight: 40, headerHeight: 30 });

  it("stacks titles and rows, with offsets and lookups", () => {
    expect(grid.rows.map((r) => [r.type, r.offset])).toEqual([["header", 0], ["emojis", 30], ["emojis", 70], ["header", 110], ["emojis", 140], ["emojis", 180]]);
    expect(grid.size).toBe(220);
    expect(grid.stickyIndexes).toEqual([0, 3]);
    expect(grid.at(grid.indexOf("b4"))?.id).toBe("b4");
    expect(grid.locate(grid.indexOf("b4"))).toMatchObject({ row: 5, column: 1, index: 4 });
  });

  it("clamps Down to a short row and crosses titles, keeping the column", () => {
    const move = (id: string, m: Parameters<typeof moveInGrid>[2], page?: number) => grid.at(moveInGrid(grid, grid.indexOf(id), m, page) ?? -1)?.id ?? null;
    expect(move("a2", "down")).toBe("a3");
    expect(move("a3", "down")).toBe("b0");
    expect(move("a2", "page-down", 2)).toBe("b0"); // clamped to a3, then on from its column
    expect(move("b3", "up")).toBe("b0");
    expect(move("b0", "up")).toBe("a3");
    expect(move("a3", "right")).toBe("b0");
    expect(move("b4", "page-down", 9)).toBeNull();
    expect(move("a0", "up")).toBeNull();
    expect(move("b2", "first")).toBe("a0");
  });
});
