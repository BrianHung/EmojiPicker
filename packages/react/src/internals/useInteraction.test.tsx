// @vitest-environment jsdom
import * as React from "react";
import { expect, it } from "vitest";
import { cleanupRoots, render } from "../../test/render";
import { en } from "../../test/en";
import { EmojiPicker, EmojiProvider } from "..";

function SkinToneTrigger() {
  return (
    <EmojiProvider data={en} prepare={false}>
      <EmojiPicker.Root>
        <EmojiPicker.SkinTone />
      </EmojiPicker.Root>
    </EmojiProvider>
  );
}

// usePress cancels a button's native keyboard click outside macOS, and jsdom isn't macOS
it("SkinToneTrigger opens with Enter and Space", () => {
  for (const key of ["Enter", " "]) {
    render(<SkinToneTrigger />);
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
