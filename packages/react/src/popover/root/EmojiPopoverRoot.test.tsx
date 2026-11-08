// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { createTestRoot } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider, useEmojiCell, useEmojiGrid, type EmojiGridState, type EmojiItem } from "../..";

function Cell({ state, item }: { state: EmojiGridState; item: EmojiItem }) {
  return <div {...useEmojiCell(state, item).cellProps} />;
}

function Grid() {
  const grid = useEmojiGrid({ rowHeight: 40, columns: 8 });
  return <div {...grid.getGridProps()}>{grid.rows.slice(0, 2).flatMap((row) => (row.type === "emojis" ? row.items.map((item) => <Cell key={item.id} state={grid.state} item={item} />) : []))}</div>;
}
import * as floating from "../../floating-ui";
import * as aria from "../../react-aria";

const press = (el: Element) =>
  React.act(() => {
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, button: 0, detail: 1 }));
  });

describe.each([
  ["floating-ui", floating],
  ["react-aria", aria],
])("%s", (_, { EmojiPopover, EmojiSuggestions }) => {
  it("stays open when onOpenChange cancels an outside press", async () => {
    const outside = document.body.appendChild(document.createElement("button"));
    const host = document.body.appendChild(document.createElement("div"));
    const root = createTestRoot(host);
    const onOpenChange = vi.fn((_: boolean, details: floating.EmojiPopover.Root.ChangeEventDetails) => details.cancel());
    await React.act(async () =>
      root.render(
        <EmojiPopover.Root defaultOpen onOpenChange={onOpenChange}>
          <EmojiPopover.Trigger>Open</EmojiPopover.Trigger>
          <EmojiPopover.Portal>
            <EmojiPopover.Positioner>
              <EmojiPopover.Popup aria-label="Emoji">
                <button type="button">Inside</button>
              </EmojiPopover.Popup>
            </EmojiPopover.Positioner>
          </EmojiPopover.Portal>
        </EmojiPopover.Root>,
      ),
    );
    press(outside);
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "outside-press", event: expect.any(Event) }));
    expect(document.querySelector('[role="dialog"]')?.hasAttribute("data-open")).toBe(true);
  });

  it("closes on a pick with reason item-press, and stays open when onOpenChange cancels it", async () => {
    const host = document.body.appendChild(document.createElement("div"));
    const root = createTestRoot(host);
    const onOpenChange = vi.fn((_: boolean, details: floating.EmojiPopover.Root.ChangeEventDetails) => details.reason === "item-press" && details.cancel());
    await React.act(async () =>
      root.render(
        <EmojiProvider data={en} prepare={false}>
          <EmojiPopover.Root defaultOpen onOpenChange={onOpenChange}>
            <EmojiPopover.Trigger>Open</EmojiPopover.Trigger>
            <EmojiPopover.Portal>
              <EmojiPopover.Positioner>
                <EmojiPopover.Popup aria-label="Emoji">
                  <EmojiPicker.Root frequent={false}>
                    <Grid />
                  </EmojiPicker.Root>
                </EmojiPopover.Popup>
              </EmojiPopover.Positioner>
            </EmojiPopover.Portal>
          </EmojiPopover.Root>
        </EmojiProvider>,
      ),
    );
    await React.act(async () => (document.querySelector('[data-unified="1f600"]') as HTMLElement).click());
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "item-press" }));
    expect(document.querySelector('[role="dialog"]')?.hasAttribute("data-open")).toBe(true);
  });

  it("clears the query on the first Escape in the search field and closes on the second, without re-attaching the input's ref", async () => {
    const host = document.body.appendChild(document.createElement("div"));
    const root = createTestRoot(host);
    const onQueryChange = vi.fn();
    const onOpenChange = vi.fn();
    const ref = vi.fn();
    await React.act(async () =>
      root.render(
        <EmojiProvider data={en} prepare={false}>
          <EmojiPopover.Root defaultOpen onOpenChange={onOpenChange}>
            <EmojiPopover.Trigger>Open</EmojiPopover.Trigger>
            <EmojiPopover.Portal>
              <EmojiPopover.Positioner>
                <EmojiPopover.Popup aria-label="Emoji">
                  <EmojiPicker.Root frequent={false} defaultQuery="smile" onQueryChange={onQueryChange}>
                    <EmojiPicker.SearchInput ref={ref} />
                    <Grid />
                  </EmojiPicker.Root>
                </EmojiPopover.Popup>
              </EmojiPopover.Positioner>
            </EmojiPopover.Portal>
          </EmojiPopover.Root>
        </EmojiProvider>,
      ),
    );
    const input = document.querySelector("input")!;
    const pressEscape = () => React.act(async () => void input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })));
    React.act(() => input.focus());
    await pressEscape();
    expect(onQueryChange).toHaveBeenCalledWith("", expect.objectContaining({ reason: "escape-key", event: expect.any(KeyboardEvent) }));
    expect([input.value, onOpenChange.mock.calls.length, ref.mock.calls]).toEqual(["", 0, [[input]]]);
    await pressEscape();
    expect(onOpenChange).toHaveBeenCalledWith(false, expect.objectContaining({ reason: "escape-key" }));
  });

  it("calls initialFocus with how the content opened, and names the Trigger in the change details", async () => {
    const host = document.body.appendChild(document.createElement("div"));
    const root = createTestRoot(host);
    const target = React.createRef<HTMLButtonElement>();
    const initialFocus = vi.fn(() => target.current);
    const onOpenChange = vi.fn();
    await React.act(async () =>
      root.render(
        <EmojiPopover.Root onOpenChange={onOpenChange}>
          <EmojiPopover.Trigger>Open</EmojiPopover.Trigger>
          <EmojiPopover.Portal>
            <EmojiPopover.Positioner>
              <EmojiPopover.Popup aria-label="Emoji" initialFocus={initialFocus}>
                <button type="button">First</button>
                <button type="button" ref={target}>
                  Second
                </button>
              </EmojiPopover.Popup>
            </EmojiPopover.Positioner>
          </EmojiPopover.Portal>
        </EmojiPopover.Root>,
      ),
    );
    const trigger = host.querySelector("button")!;
    press(trigger);
    await React.act(() => new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve))));
    expect(onOpenChange).toHaveBeenCalledWith(true, expect.objectContaining({ reason: "trigger-press", trigger }));
    expect(initialFocus).toHaveBeenCalledWith("mouse");
    expect(document.activeElement).toBe(target.current);
  });

  it("renders EmojiSuggestions' Positioner and Popup as parts, with state attributes and className as a function of state", async () => {
    const host = document.body.appendChild(document.createElement("div"));
    const root = createTestRoot(host);
    const anchor = { getBoundingClientRect: () => ({ top: 10, left: 10, width: 0, height: 10 }) };
    await React.act(async () =>
      root.render(
        <EmojiSuggestions.Root open>
          <EmojiSuggestions.Portal>
            <EmojiSuggestions.Positioner anchor={anchor} side="inline-end">
              <EmojiSuggestions.Popup className={({ side }) => `on-${side}`}>
                <ul />
              </EmojiSuggestions.Popup>
            </EmojiSuggestions.Positioner>
          </EmojiSuggestions.Portal>
        </EmojiSuggestions.Root>,
      ),
    );
    const popup = document.querySelector('[data-slot="emoji-suggestions-popup"]')!;
    expect([popup.parentElement?.getAttribute("data-slot"), popup.parentElement?.getAttribute("data-side"), popup.getAttribute("data-open"), popup.getAttribute("data-side"), popup.className]).toEqual([
      "emoji-suggestions-positioner",
      "inline-end",
      "",
      "inline-end",
      "on-inline-end",
    ]);
  });
});
