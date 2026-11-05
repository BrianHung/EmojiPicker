import { describe, expect, it } from "vitest";
import { createEmojiGrid, moveInGrid, rowsPerPage } from "./grid";

describe("emoji grid", () => {
  const section = (id: string, n: number, header = true) => ({ id, header, items: Array.from({ length: n }, (_, i) => ({ id: `${id}${i}` })) });
  const grid = createEmojiGrid([section("a", 4), section("b", 5)], { columns: 3, rowHeight: 40, headerHeight: 30 });

  it("fits whole rows under the sticky title, at least one", () => {
    expect(rowsPerPage(259, 40, 40)).toBe(5);
    expect(rowsPerPage(400, 40)).toBe(10);
    expect(rowsPerPage(30, 40)).toBe(1);
    expect(rowsPerPage(300, 0)).toBe(1);
  });

  it("stacks titles and rows, with offsets and lookups", () => {
    expect(grid.rows.map((r) => [r.type, r.offset])).toEqual([
      ["header", 0],
      ["emojis", 30],
      ["emojis", 70],
      ["header", 110],
      ["emojis", 140],
      ["emojis", 180],
    ]);
    expect(grid.size).toBe(220);
    expect(grid.stickyIndexes).toEqual([0, 3]);
    expect(grid.at(grid.indexOf("b4"))?.id).toBe("b4");
    expect(grid.locate(grid.indexOf("b4"))).toMatchObject({ row: 5, column: 1, index: 4 });
  });

  it("clamps Down to a short row and crosses titles, keeping the column", () => {
    const move = (id: string, m: Parameters<typeof moveInGrid>[2], page?: number) => grid.at(moveInGrid(grid, grid.indexOf(id), m, page) ?? -1)?.id ?? null;
    expect(move("a2", "down")).toBe("a3");
    expect(move("a3", "down")).toBe("b0");
    expect(move("a2", "page-down", 2)).toBe("b0");
    expect(move("b3", "up")).toBe("b0");
    expect(move("b0", "up")).toBe("a3");
    expect(move("a3", "right")).toBe("b0");
    expect(move("b4", "page-down", 9)).toBeNull();
    expect(move("a0", "up")).toBeNull();
    expect(move("b2", "first")).toBe("a0");
  });
});
