// Core without a framework, driven the way a Vue or Svelte adapter would: subscribe, act, read the snapshot.
import { describe, expect, it } from "vitest";
import data from "../../data/en.json";
import type { Dataset } from "./dataset";
import { createFrequencyStore, memoryStorage } from "./frequents";
import { createPickerState, moveHighlight } from "./picker";
import { createEmojiStore } from "./store";
import { createEmojiSuggestions } from "./suggestions";

const ready = async () => {
  const store = createEmojiStore({ data: data as unknown as Dataset, frequents: createFrequencyStore({ storage: memoryStorage() }) });
  await store.load();
  return store;
};
const key = (key: string) => ({
  key,
  defaultPrevented: false,
  preventDefault() {
    this.defaultPrevented = true;
  },
});

describe("suggestions without React", () => {
  it("matches a query, moves, and chooses with keys", async () => {
    const store = await ready();
    const chosen: string[] = [];
    const typeahead = createEmojiSuggestions(store, { id: "ta", onChoose: (s) => chosen.push(typeahead.textFor(s)) });
    let renders = 0;
    const off = typeahead.subscribe(() => renders++);

    typeahead.setQuery("thumbs");
    const first = typeahead.getSnapshot();
    expect(first.open).toBe(true);
    expect(first.suggestions[0]!.shortcode).toBe("thumbsup");
    expect(typeahead.getInputProps()).toMatchObject({ role: "combobox", "aria-expanded": true, "aria-controls": "ta-listbox", "aria-activedescendant": "ta-option-0" });

    expect(typeahead.keydown(key("ArrowDown"))).toBe(true);
    expect(typeahead.getOptionProps(1)).toMatchObject({ id: "ta-option-1", "aria-selected": true, "data-highlighted": "" });
    expect(typeahead.keydown({ ...key("Enter"), isComposing: true })).toBe(false);
    expect(typeahead.keydown(key("Enter"))).toBe(true);
    expect(chosen).toEqual(["👎"]);

    expect(typeahead.keydown(key("Escape"))).toBe(true);
    expect(typeahead.getSnapshot().open).toBe(false);
    typeahead.setQuery("tada");
    expect(typeahead.getSnapshot()).toMatchObject({ open: true, highlightedIndex: 0 });
    expect(renders).toBeGreaterThan(3);
    off();
  });
});

describe("picker state without React", () => {
  it("searches, moves through the grid, and chooses", async () => {
    const store = await ready();
    const picker = createPickerState(store, { frequent: false });
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
    const store = await ready();
    const asked: (string | null)[] = [];
    const options = { frequent: false as const, onHighlightedChange: (id: string | null) => asked.push(id) };
    const picker = createPickerState(store, { ...options, highlighted: null });
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
});
