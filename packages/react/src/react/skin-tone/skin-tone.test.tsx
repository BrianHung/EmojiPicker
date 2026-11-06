// @vitest-environment jsdom
import * as React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import en from "@brianhung/emoji-picker-core/data/en.json";
import type { Dataset } from "@brianhung/emoji-picker-core";
import { EmojiPicker, EmojiProvider } from "../../index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let unmount = () => {};
afterEach(() => {
  unmount();
  document.body.replaceChildren();
});

it("keeps focus in the skin tone options when onOpenChange cancels the close", () => {
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  React.act(() =>
    root.render(
      <EmojiProvider data={en as unknown as Dataset} prepare={false} storage={{ frequents: null, skinTone: null }}>
        <EmojiPicker.Root frequent={false}>
          <EmojiPicker.SkinTone defaultOpen onOpenChange={(open, d) => !open && d.cancel()} />
        </EmojiPicker.Root>
      </EmojiProvider>,
    ),
  );
  unmount = () => React.act(() => root.unmount());
  const options = host.querySelector('[data-slot="emoji-picker-skin-tone-options"]')!;
  const option = options.querySelectorAll("button")[2]!;
  React.act(() => option.focus());
  React.act(() => void option.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
  expect(host.querySelector("[data-slot=emoji-picker-skin-tone-trigger]")?.getAttribute("aria-expanded")).toBe("true");
  expect(options.contains(document.activeElement)).toBe(true);
});
