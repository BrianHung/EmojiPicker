// @vitest-environment jsdom
import * as React from "react";
import { expect, it } from "vitest";
import { render } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider, useEmojiCell, useEmojiGrid, type EmojiGridState, type EmojiItem } from "../../index";

function Cell({ state, item }: { state: EmojiGridState; item: EmojiItem }) {
  return <div {...useEmojiCell(state, item).cellProps} />;
}

function Suggested() {
  const grid = useEmojiGrid({ rowHeight: 40, columns: 8 });
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
  expect(host.querySelector("[data-slot=emoji-picker-emoji]")?.getAttribute("data-unified")).toBe("1f44d-1f3fc");
});
