import { describe, expect, it } from "vitest";
import data from "@brianhung/emoji-picker-core/data/en.json";
import { createEmojiStore, type Dataset } from "@brianhung/emoji-picker-core";
import { createPickerState, setCategoryCollapsed } from "./picker";

const ready = async () => {
  const store = createEmojiStore({ data: data as unknown as Dataset, storage: { frequents: null } });
  await store.load();
  return store;
};

describe("picker state", () => {
  it("searches, moves through the grid, and chooses", async () => {
    const picker = createPickerState(await ready(), { frequent: false });
    const off = picker.subscribe(() => {});
    expect(picker.getSnapshot().sections[0]!.id).toBe("smileys_people");

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

  it("leaves a controlled highlight to its owner", async () => {
    const asked: (string | null)[] = [];
    const options = { frequent: false as const, onHighlightChange: (id: string | null) => asked.push(id) };
    const picker = createPickerState(await ready(), { ...options, highlight: null });
    const off = picker.subscribe(() => {});
    const before = picker.getSnapshot();
    const [first, second] = picker.getSnapshot().sections[0]!.items;

    picker.highlight(first!.id);
    expect(asked).toEqual([first!.unified]);
    expect(picker.getSnapshot().highlighted).toBeNull();
    expect(picker.getSnapshot()).toBe(before);

    picker.setOptions({ ...options, highlight: second!.unified }, { notify: true });
    expect(picker.getSnapshot()).toMatchObject({ highlighted: second!.id, active: second });
    expect(picker.choose()).toMatchObject({ emoji: second!.record.emoji });
    off();
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
