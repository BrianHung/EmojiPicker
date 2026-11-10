import { describe, expect, it } from "vitest";
import { en } from "../../test/en";
import { createEmojiStore } from "../store";
import { createEmojiPicker } from "./picker";
import { setCategoryCollapsed } from "./sections";

const ready = async () => {
  const store = createEmojiStore({ data: en });
  await store.load();
  return store;
};

describe("createEmojiPicker", () => {
  it("searches, moves through the grid, and chooses", async () => {
    const picker = createEmojiPicker(await ready(), { frequent: false });
    const off = picker.subscribe(() => {});
    expect(picker.getSnapshot().sections[0]!.id).toBe("smileys-people");

    picker.setQuery("heart");
    const { searching, sections } = picker.getSnapshot();
    expect(searching).toBe(true);
    expect(sections).toHaveLength(1);
    const [first, second] = sections[0]!.items;

    picker.highlight(first!.unified);
    picker.highlight(second!.id);
    expect(picker.getSnapshot().active).toBe(second);
    picker.hover(first!.id);
    expect(picker.getSnapshot().active).toBe(second);

    expect(picker.choose()).toMatchObject({ emoji: second!.record.emoji, name: second!.record.name });
    picker.toggleCollapsed("flags");
    picker.setQuery("");
    expect(picker.getSnapshot().categorySections.find((s) => s.id === "flags")).toMatchObject({ collapsed: true, items: [] });
    off();
  });

  it("hides results whose toned emoji this system can't draw", async () => {
    const store = await ready();
    store.setSkinTone(2);
    const picker = createEmojiPicker(store, { frequent: false, drawable: (_, unified) => !unified.includes("-1f3fc") });
    const off = picker.subscribe(() => {});
    picker.setQuery("thumbs");
    expect(picker.getSnapshot().sections.flatMap((s) => s.items.map((i) => i.unified))).not.toContain("1f44d-1f3fc");
    off();
  });

  it("leaves a controlled highlight to its owner", async () => {
    const asked: (string | null)[] = [];
    const options = { frequent: false as const, onHighlightChange: (id: string | null) => asked.push(id) };
    const picker = createEmojiPicker(await ready(), { ...options, highlight: null });
    const off = picker.subscribe(() => {});
    const before = picker.getSnapshot();
    const [first, second] = picker.getSnapshot().sections[0]!.items;

    picker.highlight(first!.id);
    expect(asked).toEqual([first!.unified]);
    expect(picker.getSnapshot().highlighted).toBeNull();
    expect(picker.getSnapshot()).toBe(before);

    picker.setOptions({ ...options, highlight: second!.unified });
    expect(picker.getSnapshot()).toMatchObject({ highlighted: second!.id, active: second });
    expect(picker.choose()).toMatchObject({ emoji: second!.record.emoji });
    off();
  });

  it("only reads in getSnapshot, and notifies once an input changes", async () => {
    const picker = createEmojiPicker(await ready(), { frequent: false, query: "cat" });
    let notified = 0;
    const off = picker.subscribe(() => notified++);
    const first = picker.getSnapshot();
    expect(first.results.length).toBeGreaterThan(0);
    expect(picker.getSnapshot()).toBe(first);
    expect(notified).toBe(0);

    picker.setOptions({ frequent: false, query: "cat" });
    expect(notified).toBe(0);
    picker.setOptions({ frequent: false, query: "dog" });
    expect(notified).toBeGreaterThan(0);
    expect(picker.getSnapshot().results[0]!.name).toMatch(/dog/);
    off();
  });

  it("highlights the first result of a new query, and keeps it for the same query", async () => {
    const picker = createEmojiPicker(await ready(), { frequent: false });
    picker.setQuery("heart");
    const sections = picker.getSnapshot().sections;
    expect(picker.retainHighlight(sections, null)).toEqual({ key: sections[0]!.items[0]!.id });
    const third = sections[0]!.items[2]!;
    picker.highlight(third.id);
    expect(picker.retainHighlight(sections, third.id)).toEqual({ key: third.id });
    picker.setQuery("");
    expect(picker.retainHighlight(picker.getSnapshot().sections, null)).toEqual({ key: null });
    expect(picker.retainHighlight(picker.getSnapshot().sections, null)).toBeNull();
  });

  it("toggles collapsed ids, returning the same array when nothing changes", () => {
    const one = setCategoryCollapsed([], "flags");
    expect(one).toEqual(["flags"]);
    expect(setCategoryCollapsed(one, "symbols")).toEqual(["flags", "symbols"]);
    expect(setCategoryCollapsed(one, "flags")).toEqual([]);
    expect(setCategoryCollapsed(one, "flags", true)).toBe(one);
    expect(setCategoryCollapsed(one, "objects", false)).toBe(one);
  });
});
