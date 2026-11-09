// @vitest-environment jsdom
import * as React from "react";
import { expect, it } from "vitest";
import { render } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider, useEmojiPickerCell, useEmojiPickerGrid, type EmojiPickerGridState, type EmojiItem } from "../..";

function Cell({ state, item }: { state: EmojiPickerGridState; item: EmojiItem }) {
  return <div {...useEmojiPickerCell(state, item).cellProps} />;
}

function Suggested() {
  const grid = useEmojiPickerGrid({ rowHeight: 40, columns: 8 });
  const row = grid.rows.find((r) => r.type === "emojis");
  return <div {...grid.getGridProps()}>{row?.type === "emojis" ? row.items.map((item) => <Cell key={item.id} state={grid.state} item={item} />) : null}</div>;
}

const key = (el: Element, type: "keydown" | "keyup", name: string) => React.act(() => void el.dispatchEvent(new KeyboardEvent(type, { key: name, bubbles: true, cancelable: true })));
const press = (name: string) => {
  const el = document.activeElement!;
  key(el, "keydown", name);
  key(el, "keyup", name);
};

it("keeps focus in the skin tone options when onOpenChange cancels the close", () => {
  const host = render(
    <EmojiProvider data={en} prepare={false}>
      <EmojiPicker.Root frequent={false}>
        <EmojiPicker.SkinTone defaultOpen onOpenChange={(open, d) => !open && d.cancel()} />
      </EmojiPicker.Root>
    </EmojiProvider>,
  );
  const options = host.querySelector('[data-slot="emoji-picker-skin-tone-options"]')!;
  const option = options.querySelectorAll("button")[2]!;
  React.act(() => option.focus());
  key(option, "keydown", "Escape");
  expect(host.querySelector("[data-slot=emoji-picker-skin-tone-trigger]")?.getAttribute("aria-expanded")).toBe("true");
  expect(options.contains(document.activeElement)).toBe(true);
});

it("opens on the current tone, moves with the arrows, and applies the tone with Enter", () => {
  const host = render(
    <EmojiProvider data={en} prepare={false}>
      <EmojiPicker.Root suggested={["1f44d"]}>
        <EmojiPicker.SkinTone />
        <Suggested />
      </EmojiPicker.Root>
    </EmojiProvider>,
  );
  const trigger = host.querySelector<HTMLButtonElement>("[data-slot=emoji-picker-skin-tone-trigger]")!;
  React.act(() => trigger.focus());
  press("Enter");
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Default skin tone");
  expect(host.querySelector('[data-slot="emoji-picker-skin-tone-options"]')?.getAttribute("role")).toBe("toolbar");
  press("ArrowRight");
  press("ArrowRight");
  expect(document.activeElement?.getAttribute("aria-label")).toBe("Medium-light skin tone");
  press("Enter");
  expect(trigger.getAttribute("aria-label")).toBe("Medium-light skin tone");
  expect(document.activeElement).toBe(trigger);
  expect(host.querySelector("[data-slot=emoji-picker-list-cell]")?.getAttribute("data-unified")).toBe("1f44d-1f3fc");
});

it("asks once to close on an outside press", () => {
  const changes: string[] = [];
  render(
    <EmojiProvider data={en} prepare={false}>
      <EmojiPicker.Root frequent={false}>
        <EmojiPicker.SkinTone defaultOpen onOpenChange={(open, d) => (changes.push(`${open} ${d.reason}`), d.cancel())} />
      </EmojiPicker.Root>
    </EmojiProvider>,
  );
  React.act(() => {
    document.body.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, button: 0 }));
    document.body.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, button: 0 }));
  });
  expect(changes).toEqual(["false outside-press"]);
});
