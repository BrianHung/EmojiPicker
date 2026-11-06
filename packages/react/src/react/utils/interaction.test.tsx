// @vitest-environment jsdom
import * as React from "react";
import { expect, it } from "vitest";
import { cleanupRoots, render } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider } from "../../index";
import * as floating from "../../floating-ui";
import * as aria from "../../react-aria";

function interactions(node: React.ReactNode) {
  render(node);
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
    <EmojiProvider data={en} prepare={false}>
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

// usePress cancels a button's native keyboard click outside macOS, and jsdom isn't macOS
it.each([
  ["SkinTone.Trigger", SkinToneTrigger],
  ["EmojiPopover.Trigger from /floating-ui", popoverTrigger(floating)],
  ["EmojiPopover.Trigger from /react-aria", popoverTrigger(aria)],
])("%s opens with Enter and Space", (_, Trigger) => {
  for (const key of ["Enter", " "]) {
    render(<Trigger />);
    const el = document.querySelector("button")!;
    React.act(() => {
      el.focus();
      el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
      el.dispatchEvent(new KeyboardEvent("keyup", { key, bubbles: true, cancelable: true }));
    });
    expect(el.getAttribute("aria-expanded"), JSON.stringify(key)).toBe("true");
    cleanupRoots();
    document.body.replaceChildren();
  }
});
