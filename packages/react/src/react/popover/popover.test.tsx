// @vitest-environment jsdom
import * as React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as floating from "../../floating-ui";
import * as aria from "../../react-aria";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, CSS: { escape: (s: string) => s.replace(/[^\w-]/g, "\\$&") } });

let unmount = () => {};
afterEach(() => {
  unmount();
  document.body.replaceChildren();
});

const outsidePress = (el: Element) =>
  React.act(() => {
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0 }));
  });

describe.each([
  ["floating-ui", floating.EmojiPopover],
  ["react-aria", aria.EmojiPopover],
])("%s EmojiPopover", (_, EmojiPopover) => {
  it("stays open when onOpenChange cancels an outside press", async () => {
    const outside = document.body.appendChild(document.createElement("button"));
    const host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    const onOpenChange = vi.fn((_: boolean, details: floating.PopoverOpenChangeDetails) => details.cancel());
    await React.act(async () =>
      root.render(
        <EmojiPopover.Root defaultOpen onOpenChange={onOpenChange}>
          <EmojiPopover.Trigger>Open</EmojiPopover.Trigger>
          <EmojiPopover.Content aria-label="Emoji">
            <button type="button">Inside</button>
          </EmojiPopover.Content>
        </EmojiPopover.Root>,
      ),
    );
    unmount = () => React.act(() => root.unmount());
    outsidePress(outside);
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "outside-press" }));
    expect(document.querySelector('[role="dialog"]')?.getAttribute("data-state")).toBe("open");
  });
});
