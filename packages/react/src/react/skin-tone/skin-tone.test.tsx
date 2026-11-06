// @vitest-environment jsdom
import * as React from "react";
import { expect, it } from "vitest";
import { render } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider } from "../../index";

it("keeps focus in the skin tone options when onOpenChange cancels the close", () => {
  const host = render(
    <EmojiProvider data={en} prepare={false} storage={{ frequents: null, skinTone: null }}>
      <EmojiPicker.Root frequent={false}>
        <EmojiPicker.SkinTone defaultOpen onOpenChange={(open, d) => !open && d.cancel()} />
      </EmojiPicker.Root>
    </EmojiProvider>,
  );
  const options = host.querySelector('[data-slot="emoji-picker-skin-tone-options"]')!;
  const option = options.querySelectorAll("button")[2]!;
  React.act(() => option.focus());
  React.act(() => void option.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
  expect(host.querySelector("[data-slot=emoji-picker-skin-tone-trigger]")?.getAttribute("aria-expanded")).toBe("true");
  expect(options.contains(document.activeElement)).toBe(true);
});
