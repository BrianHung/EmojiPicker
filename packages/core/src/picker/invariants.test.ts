import fc from "fast-check";
import { expect, it } from "vitest";
import { en } from "../../test/en";
import { KEY_MOVES } from "../keys";
import { createEmojiStore, type EmojiStore } from "../store";
import { createEmojiSuggestions } from "../suggestions";
import { createEmojiGrid } from "./grid";
import { createGridNavigation } from "./navigation";
import { createEmojiPicker, type EmojiPickerOptions } from "./picker";
import { findItem } from "./sections";

const store = createEmojiStore({ data: en });
await store.load();
const fresh = (): EmojiStore => (store.setSkinTone(0), store.frequents.clear(), store);

const QUERIES = ["", " ", "cat", "heart", "thumbs", "thumbz", "hart", "smile face", "hand", ":tada", "tad", "zzzz"];
const RULES: EmojiPickerOptions["drawable"][] = [undefined, (_, u) => !/-1f3f[b-f]/.test(u), (_, u) => !u.includes("200d"), (r) => !r.name.includes("heart")];
const MOVES = Object.values(KEY_MOVES);

it("picker: shown results are drawable and counted, and the highlight is a shown item that choose() picks", () => {
  const step = fc.tuple(fc.constantFrom("query", "move", "highlight", "hover", "tone", "drawable", "choose"), fc.nat(1000));
  fc.assert(
    fc.property(fc.array(step, { maxLength: 30 }), (steps) => {
      const store = fresh();
      let options: EmojiPickerOptions = {};
      const picker = createEmojiPicker(store, options);
      const off = picker.subscribe(() => {});
      const grid = () => createEmojiGrid(picker.getSnapshot().sections, { columns: 8, rowHeight: 40 });
      const navigation = createGridNavigation(() => ({ grid: grid(), strip: null, metrics: { cellHeight: 40, headerHeight: 0 } }));
      for (const [kind, n] of steps) {
        const { sections, highlighted } = picker.getSnapshot();
        const items = sections.flatMap((s) => s.items);
        const pick = items.length ? items[n % items.length]!.id : null;
        if (kind === "query") picker.setQuery(QUERIES[n % QUERIES.length]!);
        else if (kind === "move") picker.highlight(highlighted == null ? navigation.first() : navigation.move(highlighted, MOVES[n % MOVES.length]!, 320));
        else if (kind === "highlight") picker.highlight(n % 5 ? pick : "1f44d");
        else if (kind === "hover") picker.hover(pick);
        else if (kind === "tone") store.setSkinTone((n % 6) as 0);
        else if (kind === "drawable") picker.setOptions((options = { drawable: RULES[n % RULES.length] }));
        else expect(picker.choose()?.unified).toBe(findItem(sections, highlighted)?.unified);

        const next = picker.getSnapshot();
        const shown = next.sections.flatMap((s) => s.items);
        if (next.searching) {
          expect(next.results).toHaveLength(shown.length);
          for (const item of shown) expect(options.drawable?.(item.record, item.unified) ?? true).toBe(true);
        }
        if (next.highlighted != null) expect(shown.map((i) => i.id)).toContain(next.highlighted);
      }
      off();
    }),
    { numRuns: 100 },
  );
});

it("suggestions: modified keys stay with the field, and the highlight stays on a suggestion", () => {
  const KEYS = ["Enter", "Tab", "Escape", "ArrowDown", "ArrowUp", "ArrowLeft", "a"];
  const step = fc.tuple(fc.constantFrom(...QUERIES), fc.constantFrom(...KEYS), fc.boolean(), fc.boolean(), fc.boolean(), fc.boolean());
  fc.assert(
    fc.property(fc.constantFrom<"shortcode" | "search">("shortcode", "search"), fc.constantFrom(undefined, 8), fc.array(step, { maxLength: 20 }), (matchBy, columns, steps) => {
      const typeahead = createEmojiSuggestions(fresh(), { matchBy, columns });
      const off = typeahead.subscribe(() => {});
      for (const [query, key, metaKey, ctrlKey, altKey, retype] of steps) {
        if (retype) typeahead.setQuery(query.replace(/^:/, ""));
        let prevented = false;
        const handled = typeahead.keydown({ key, metaKey, ctrlKey, altKey, preventDefault: () => (prevented = true) });
        if (metaKey || ctrlKey || altKey) expect([handled, prevented]).toEqual([false, false]);
        const { open, suggestions, highlightedIndex } = typeahead.getSnapshot();
        expect(open && suggestions.length === 0).toBe(false);
        expect(highlightedIndex).toBeGreaterThanOrEqual(0);
        expect(highlightedIndex).toBeLessThanOrEqual(Math.max(suggestions.length - 1, 0));
      }
      off();
    }),
    { numRuns: 100 },
  );
});
