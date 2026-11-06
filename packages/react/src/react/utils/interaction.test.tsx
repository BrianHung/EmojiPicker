// @vitest-environment jsdom
import * as React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import en from "@brianhung/emoji-picker-core/data/en.json";
import type { Dataset } from "@brianhung/emoji-picker-core";
import { EmojiPicker, EmojiProvider } from "../../index";
import * as floating from "../../floating-ui";
import * as aria from "../../react-aria";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
Object.assign(HTMLCanvasElement.prototype, { getContext: () => null });

let unmount = () => {};
afterEach(() => {
  unmount();
  document.body.replaceChildren();
});

function interactions(node: React.ReactNode) {
  const root = createRoot(document.body.appendChild(document.createElement("div")));
  React.act(() => root.render(node));
  unmount = () => React.act(() => root.unmount());
  const el = document.querySelector("button")!;
  const seen: string[] = [];
  const check = (name: string) => el.hasAttribute(name) && seen.push(name);
  React.act(() => void el.dispatchEvent(new MouseEvent("mouseover", { bubbles: true })));
  check("data-hovered");
  React.act(() => void el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, button: 0 })));
  check("data-pressed");
  React.act(() => void el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true, button: 0 })));
  React.act(() => {
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    el.focus();
  });
  check("data-focus-visible");
  return seen;
}

function SkinToneTrigger() {
  return (
    <EmojiProvider data={en as unknown as Dataset} prepare={false} storage={{ skinTone: null }}>
      <EmojiPicker.Root>
        <EmojiPicker.SkinTone />
      </EmojiPicker.Root>
    </EmojiProvider>
  );
}

const popoverTrigger = ({ EmojiPopover }: typeof floating | typeof aria) =>
  function PopoverTrigger() {
    return (
      <EmojiPopover.Root>
        <EmojiPopover.Trigger>Open</EmojiPopover.Trigger>
      </EmojiPopover.Root>
    );
  };

it.each([
  ["SkinTone.Trigger", SkinToneTrigger],
  ["EmojiPopover.Trigger from /floating-ui", popoverTrigger(floating)],
  ["EmojiPopover.Trigger from /react-aria", popoverTrigger(aria)],
])("%s is hovered, pressed and focus-visible like other buttons", (_, Trigger) => {
  expect(interactions(<Trigger />)).toEqual(["data-hovered", "data-pressed", "data-focus-visible"]);
});
