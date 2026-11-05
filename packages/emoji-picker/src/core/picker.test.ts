import { describe, expect, it } from "vitest";
import data from "../../data/en.json";
import type { Dataset } from "./dataset";
import { createFrequencyStore, memoryStorage } from "./frequents";
import { createPickerState, moveHighlight, setCategoryCollapsed } from "./picker";
import { createEmojiStore } from "./store";

const ready = async () => {
  const store = createEmojiStore({ data: data as unknown as Dataset, frequents: createFrequencyStore({ storage: memoryStorage() }) });
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

    expect(moveHighlight(picker, "right", { columns: 8 })).toBe(first!.id);
    expect(moveHighlight(picker, "right", { columns: 8 })).toBe(second!.id);
    expect(picker.getSnapshot().active).toBe(second);
    picker.hover(first!.id);
    expect(picker.getSnapshot().active).toBe(first);

    expect(picker.choose()).toMatchObject({ emoji: second!.record.emoji, name: second!.record.name });
    picker.toggleCollapsed("flags");
    picker.setQuery("");
    expect(picker.getSnapshot().categorySections.find((s) => s.id === "flags")).toMatchObject({ collapsed: true, items: [] });
    off();
  });

  it("leaves a controlled highlight to its owner", async () => {
    const asked: (string | null)[] = [];
    const options = { frequent: false as const, onHighlightedChange: (id: string | null) => asked.push(id) };
    const picker = createPickerState(await ready(), { ...options, highlighted: null });
    let renders = 0;
    const off = picker.subscribe(() => renders++);
    const [first, second] = picker.getSnapshot().sections[0]!.items;

    picker.highlight(first!.id);
    expect(asked).toEqual([first!.id]);
    expect(picker.getSnapshot().highlighted).toBeNull();
    expect(renders).toBe(0);

    picker.setOptions({ ...options, highlighted: second!.id }, { notify: true });
    expect(renders).toBe(1);
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
