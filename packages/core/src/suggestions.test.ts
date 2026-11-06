import { describe, expect, it } from "vitest";
import { en } from "../test/en";
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
    const store = createEmojiStore({ data: en, storage: { frequents: null } });
    await store.load();
    const chosen: string[] = [];
    const selected: string[] = [];
    const typeahead = createEmojiSuggestions(store, { id: "ta", onChoose: (s) => chosen.push(typeahead.textFor(s)), onSelect: (s) => selected.push(s.unified) });
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
    expect(selected).toEqual(["1f44e"]);
    expect(store.frequents.top(1)).toEqual(["1f44e"]);

    typeahead.insert(store.select("1f389", { count: false })!);
    expect(chosen).toEqual(["👎", "🎉"]);
    expect(selected).toEqual(["1f44e", "1f389"]);
    expect(store.frequents.score("1f389")).toBe(0);

    expect(typeahead.keydown(key("Escape"))).toBe(true);
    expect(typeahead.getSnapshot().open).toBe(false);
    typeahead.setQuery("tada");
    expect(typeahead.getSnapshot()).toMatchObject({ open: true, highlightedIndex: 0 });
    expect(renders).toBeGreaterThan(3);
    off();
  });

  it("resets the highlight whenever the reset key changes, even back to an earlier one", async () => {
    const store = createEmojiStore({ data: en, storage: { frequents: null } });
    await store.load();
    const typeahead = createEmojiSuggestions(store, { query: "heart" });
    typeahead.highlight(2);
    typeahead.setOptions({ query: "heart" });
    expect(typeahead.getSnapshot().highlightedIndex).toBe(2);
    typeahead.setOptions({ query: "hear" });
    typeahead.setOptions({ query: "heart" });
    expect(typeahead.getSnapshot().highlightedIndex).toBe(0);
  });
});
