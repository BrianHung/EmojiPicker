// @vitest-environment jsdom
import { expect, it } from "vitest";
import { schema } from "prosemirror-schema-basic";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import data from "../data/en.json";
import type { Dataset } from "./dataset";
import { createFrequencyStore, memoryStorage } from "./frequents";
import { createEmojiStore } from "./store";
import { emojiTypeahead } from "./prosemirror";

it("opens on :smi, and ArrowDown + Enter replaces it with the emoji; a composing Enter doesn't", async () => {
  const store = createEmojiStore({ data: data as unknown as Dataset, frequents: createFrequencyStore({ storage: memoryStorage() }) });
  await store.load();
  const { plugin, suggestions } = emojiTypeahead(store, { id: "pm" });
  const view = new EditorView(document.body.appendChild(document.createElement("div")), { state: EditorState.create({ schema, plugins: [plugin] }) });
  const press = (key: string, init: KeyboardEventInit = {}) => view.dom.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init }));

  view.dispatch(view.state.tr.insertText("hi :smi"));
  expect(suggestions.getSnapshot()).toMatchObject({ query: "smi", open: true });
  expect(view.dom.getAttribute("aria-expanded")).toBe("true");

  press("Enter", { isComposing: true });
  expect(view.state.doc.textContent).toBe("hi :smi");

  press("ArrowDown");
  const { suggestions: list, highlightedIndex } = suggestions.getSnapshot();
  expect(highlightedIndex).toBe(1);
  press("Enter");
  expect(view.state.doc.textContent).toBe(`hi ${suggestions.textFor(list[1]!)} `);
  expect(suggestions.getSnapshot().open).toBe(false);
  expect(view.dom.hasAttribute("aria-expanded")).toBe(false);
  expect(view.dom.hasAttribute("role")).toBe(false);
  view.destroy();
});
