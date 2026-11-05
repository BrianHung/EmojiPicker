import { describe, expect, it } from "vitest";
import data from "../data/en.json";
import type { Dataset } from "./dataset";
import { createFrequencyStore, memoryStorage } from "./frequents";
import { createEmojiStore } from "./store";
import { createEmojiSuggestions } from "./suggestions";

const key = (key: string) => ({
  key,
  defaultPrevented: false,
  preventDefault() {
    this.defaultPrevented = true;
  },
});

describe("suggestions", () => {
  it("matches a query, moves, and chooses with keys", async () => {
    const store = createEmojiStore({ data: data as unknown as Dataset, frequents: createFrequencyStore({ storage: memoryStorage() }) });
    await store.load();
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
