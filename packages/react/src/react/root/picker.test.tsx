// @vitest-environment jsdom
import * as React from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import en from "@brianhung/emoji-picker-core/data/en.json";
import type { Dataset, EmojiItem } from "@brianhung/emoji-picker-core";
import { EmojiPicker, EmojiProvider, useEmojiCell, useEmojiGrid, type EmojiGridState, type EmojiPickerActions, type RootProps } from "../../index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, CSS: { escape: (s: string) => s.replace(/[^\w-]/g, "\\$&") } });
Object.assign(HTMLCanvasElement.prototype, { getContext: () => null });

function Cell({ state, item }: { state: EmojiGridState; item: EmojiItem }) {
  return <div {...useEmojiCell(state, item).cellProps} />;
}

function Grid() {
  const grid = useEmojiGrid({ rowHeight: 40, columns: 8 });
  return <div {...grid.getGridProps()}>{grid.rows.slice(0, 3).flatMap((row) => (row.type === "emojis" ? row.items.map((item) => <Cell key={item.id} state={grid.state} item={item} />) : []))}</div>;
}

let unmount = () => {};
afterEach(() => {
  unmount();
  document.body.replaceChildren();
});

function mount(props: Partial<RootProps>) {
  const input = document.body.appendChild(document.createElement("input"));
  const host = document.body.appendChild(document.createElement("div"));
  const root = createRoot(host);
  const actions = React.createRef<EmojiPickerActions>();
  React.act(() =>
    root.render(
      <EmojiProvider data={en as unknown as Dataset} prepare={false}>
        <EmojiPicker.Root frequent={false} keyboardTarget={input} actionsRef={actions} {...props}>
          <Grid />
        </EmojiPicker.Root>
      </EmojiProvider>,
    ),
  );
  unmount = () => React.act(() => root.unmount());
  input.focus();
  return { input, host, actions: actions.current! };
}

const press = (el: Element, key: string, init: KeyboardEventInit = {}) => React.act(() => void el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init })));
const highlighted = (host: Element) => host.querySelector("[data-highlighted]")?.getAttribute("data-unified");

describe("Root keyboard", () => {
  it("drives the grid from the keyboard target and actionsRef while focus stays there", () => {
    const onSelect = vi.fn();
    const { input, host, actions } = mount({ onSelect });
    press(input, "ArrowRight");
    press(input, "ArrowRight");
    expect(highlighted(host)).toBe("1f603");
    expect(input.getAttribute("aria-activedescendant")).toBe(host.querySelector("[data-highlighted]")!.id);
    press(input, "Enter");
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ unified: "1f603" }), expect.anything());
    press(input, "Tab");
    expect(onSelect).toHaveBeenCalledTimes(1);
    input.setAttribute("aria-expanded", "true");
    press(input, "Tab");
    expect(onSelect).toHaveBeenCalledTimes(2);
    React.act(() => void actions.move("left"));
    React.act(() => void actions.pick());
    expect(onSelect).toHaveBeenLastCalledWith(expect.objectContaining({ unified: "1f600" }), expect.anything());
    expect(document.activeElement).toBe(input);
  });

  it("reports whether the keyboard or the pointer moved the highlight", () => {
    const onHighlightChange = vi.fn();
    const { input, host } = mount({ onHighlightChange });
    press(input, "ArrowRight");
    expect(onHighlightChange).toHaveBeenLastCalledWith("smileys_people:1f600", expect.objectContaining({ reason: "keyboard" }));
    React.act(() => void host.querySelector('[data-unified="1f604"]')!.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 9, clientY: 9 })));
    expect(onHighlightChange).toHaveBeenLastCalledWith("smileys_people:1f604", expect.objectContaining({ reason: "pointer" }));
  });

  it("leaves a controlled highlight to its owner", () => {
    const onHighlightChange = vi.fn();
    const { input, host } = mount({ highlight: "smileys_people:1f600", onHighlightChange });
    press(input, "ArrowRight");
    expect(onHighlightChange).toHaveBeenLastCalledWith("smileys_people:1f603", expect.objectContaining({ reason: "keyboard" }));
    expect(highlighted(host)).toBe("1f600");
    expect(host.querySelector("aside")!.hasAttribute("highlight")).toBe(false);
  });

  it("keeps the highlight where it is when onHighlightChange cancels", () => {
    const { input, host } = mount({ onHighlightChange: (_, details) => details.cancel() });
    press(input, "ArrowRight");
    expect(highlighted(host)).toBeUndefined();
  });

  it("renames categories in parts that did not re-render", () => {
    const parts = (
      <>
        <EmojiPicker.CategoryNav />
        <Grid />
      </>
    );
    const host = document.body.appendChild(document.createElement("div"));
    const root = createRoot(host);
    const render = (name: string) =>
      React.act(() =>
        root.render(
          <EmojiProvider data={en as unknown as Dataset} prepare={false}>
            <EmojiPicker.Root categories={[{ id: "smileys_people", name }, { id: "animals_nature" }]}>{parts}</EmojiPicker.Root>
          </EmojiProvider>,
        ),
      );
    unmount = () => React.act(() => root.unmount());
    render("Faces");
    render("People");
    expect(host.querySelector('[role="tab"]')?.getAttribute("aria-label")).toBe("People");
  });

  it("runs onKeyDown first, and preventEmojiPickerHandler skips the picker's handler", () => {
    const onQueryChange = vi.fn();
    const { host } = mount({ defaultQuery: "smile", onQueryChange, onKeyDown: (e) => e.shiftKey || e.preventEmojiPickerHandler() });
    const root = host.querySelector("aside")!;
    press(root, "Escape");
    expect(onQueryChange).not.toHaveBeenCalled();
    press(root, "Escape", { shiftKey: true });
    expect(onQueryChange).toHaveBeenCalledWith("", expect.objectContaining({ reason: "escape-key" }));
  });
});
