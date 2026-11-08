// @vitest-environment jsdom
import { expect, it } from "vitest";
import { en } from "../../test/en";
import { KEY_MOVES } from "../keys";
import { createEmojiStore } from "../store";
import { syncAriaAttributes } from "../sync-attributes";
import { createEmojiGrid } from "./grid";
import { createGridNavigation } from "./navigation";
import { createEmojiPicker } from "./picker";

// A whole binding without a framework: subscribe, render the snapshot, and send keys to the engine
function mountPicker(host: HTMLElement, input: HTMLInputElement) {
  const store = createEmojiStore({ data: en });
  const picker = createEmojiPicker(store, { frequent: false });
  const grid = () => createEmojiGrid(picker.getSnapshot().sections, { columns: 8, rowHeight: 40 });
  const navigation = createGridNavigation(() => ({ grid: grid(), strip: null, metrics: { cellHeight: 40, headerHeight: 0 } }));
  const render = () => {
    const { sections, highlighted } = picker.getSnapshot();
    host.replaceChildren(
      ...sections
        .slice(0, 1)
        .flatMap((s) => s.items.slice(0, 16))
        .map((item) => Object.assign(document.createElement("div"), { id: item.id, role: "option", ariaSelected: String(item.id === highlighted), textContent: item.record.emoji })),
    );
  };
  const unsubscribe = picker.subscribe(render);
  const unsync = syncAriaAttributes(input, () => ({ "aria-activedescendant": picker.getSnapshot().highlighted ?? undefined }), picker.subscribe);
  input.addEventListener("input", () => picker.setQuery(input.value, { reason: "input-change" }));
  input.addEventListener("keydown", (e) => {
    const move = KEY_MOVES[e.key];
    const { highlighted } = picker.getSnapshot();
    if (move) picker.highlight(highlighted == null ? navigation.first() : navigation.move(highlighted, move), { reason: "keyboard", event: e });
    else if (e.key === "Enter") picker.choose();
  });
  return { store, picker, render, stop: () => (unsync(), unsubscribe()) };
}

it("drives the headless picker from plain DOM events", async () => {
  const host = document.body.appendChild(document.createElement("div"));
  const input = document.body.appendChild(document.createElement("input"));
  const { store, picker, render, stop } = mountPicker(host, input);
  await store.load();
  render();
  expect(host.children).toHaveLength(16);

  input.value = "cat";
  input.dispatchEvent(new Event("input"));
  expect(picker.getSnapshot().searching).toBe(true);
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }));
  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }));
  const id = picker.getSnapshot().highlighted!;
  expect(input.getAttribute("aria-activedescendant")).toBe(id);
  expect(host.querySelector('[aria-selected="true"]')?.id).toBe(id);

  input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
  expect(store.frequents.top(1)).toEqual([picker.getSnapshot().active!.record.unified]);
  stop();
  expect(input.hasAttribute("aria-activedescendant")).toBe(false);
});
