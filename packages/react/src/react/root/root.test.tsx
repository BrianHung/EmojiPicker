// @vitest-environment jsdom
import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { createTestRoot, render } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider, useEmojiCell, useEmojiGrid, useSkinTone, type EmojiGridState, type EmojiItem, type EmojiPickerActions, type RootProps } from "../../index";

function Cell({ state, item }: { state: EmojiGridState; item: EmojiItem }) {
  return <div {...useEmojiCell(state, item).cellProps} />;
}

function Grid() {
  const grid = useEmojiGrid({ rowHeight: 40, columns: 8 });
  return <div {...grid.getGridProps()}>{grid.rows.slice(0, 3).flatMap((row) => (row.type === "emojis" ? row.items.map((item) => <Cell key={item.id} state={grid.state} item={item} />) : []))}</div>;
}

function mount(props: Partial<RootProps>) {
  const input = document.body.appendChild(document.createElement("input"));
  const host = document.body.appendChild(document.createElement("div"));
  const root = createTestRoot(host);
  const actions = React.createRef<EmojiPickerActions>();
  React.act(() =>
    root.render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root frequent={false} keyboardTarget={input} actionsRef={actions} {...props}>
          <Grid />
        </EmojiPicker.Root>
      </EmojiProvider>,
    ),
  );
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

  it("stops the Escape that clears the query unless onQueryChange allows propagation", () => {
    let allow = false;
    const { host } = mount({ query: "smile", onQueryChange: (_, details) => allow && details.allowPropagation() });
    const reached = vi.fn();
    document.addEventListener("keydown", reached);
    press(host.querySelector("aside")!, "Escape");
    allow = true;
    press(host.querySelector("aside")!, "Escape");
    document.removeEventListener("keydown", reached);
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("reports whether the keyboard or the pointer moved the highlight", () => {
    const onHighlightChange = vi.fn();
    const { input, host } = mount({ onHighlightChange });
    press(input, "ArrowRight");
    expect(onHighlightChange).toHaveBeenLastCalledWith("1f600", expect.objectContaining({ reason: "keyboard", key: "smileys_people:1f600" }));
    React.act(() => void host.querySelector('[data-unified="1f604"]')!.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 9, clientY: 9 })));
    expect(onHighlightChange).toHaveBeenLastCalledWith("1f604", expect.objectContaining({ reason: "pointer" }));
  });

  it("leaves a controlled highlight to its owner", () => {
    const onHighlightChange = vi.fn();
    const { input, host } = mount({ highlight: "smileys_people:1f600", onHighlightChange });
    press(input, "ArrowRight");
    expect(onHighlightChange).toHaveBeenLastCalledWith("1f603", expect.objectContaining({ reason: "keyboard", key: "smileys_people:1f603" }));
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
    const root = createTestRoot(host);
    const show = (name: string) =>
      React.act(() =>
        root.render(
          <EmojiProvider data={en} prepare={false}>
            <EmojiPicker.Root categories={[{ id: "smileys_people", name }, { id: "animals_nature" }]}>{parts}</EmojiPicker.Root>
          </EmojiProvider>,
        ),
      );
    show("Faces");
    show("People");
    expect(host.querySelector('[data-slot="emoji-picker-category-tab"]')?.getAttribute("aria-label")).toBe("People");
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

  it("fires onValueChange when only onValueChange is passed", () => {
    const onValueChange = vi.fn();
    const { input } = mount({ onValueChange });
    press(input, "ArrowRight");
    press(input, "Enter");
    expect(onValueChange).toHaveBeenCalledWith("1f600", expect.objectContaining({ reason: "item-press" }));
  });

  it("keeps arrow keys and Enter working after a skin tone change re-keys the highlighted emoji", () => {
    const onHighlightChange = vi.fn();
    const onSelect = vi.fn();
    const setTone = { current: (_: 0 | 1 | 2 | 3 | 4 | 5) => {} };
    function ToneSetter() {
      const [, set] = useSkinTone();
      setTone.current = (t) => set(t);
      return null;
    }
    const input = document.body.appendChild(document.createElement("input"));
    const actions = React.createRef<EmojiPickerActions>();
    render(
      <EmojiProvider data={en} prepare={false} storage={{ frequents: null, skinTone: null }}>
        <EmojiPicker.Root frequent={false} keyboardTarget={input} actionsRef={actions} onHighlightChange={onHighlightChange} onSelect={onSelect}>
          <ToneSetter />
          <Grid />
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    input.focus();
    React.act(() => actions.current!.highlight("1f44d"));
    expect(onHighlightChange).toHaveBeenLastCalledWith("1f44d", expect.objectContaining({ key: "smileys_people:1f44d" }));
    React.act(() => setTone.current(2));
    onHighlightChange.mockClear();
    const arrow = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true });
    const enter = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    React.act(() => void input.dispatchEvent(arrow));
    React.act(() => void input.dispatchEvent(enter));
    expect({ arrowPrevented: arrow.defaultPrevented, moved: onHighlightChange.mock.calls.length, enterPrevented: enter.defaultPrevented, selected: onSelect.mock.calls.length }).toEqual({
      arrowPrevented: true,
      moved: 1,
      enterPrevented: true,
      selected: 1,
    });
  });

  it("skips a cell's pick when its onClick calls preventEmojiPickerHandler", () => {
    const onSelect = vi.fn();
    render(
      <EmojiProvider data={en} prepare={false} storage={{ frequents: null, skinTone: null }}>
        <EmojiPicker.Root frequent={false} onSelect={onSelect}>
          <EmojiPicker.Viewport>
            <EmojiPicker.List>
              {() => (
                <EmojiPicker.List.Section>
                  <EmojiPicker.List.Items>{(emoji) => <EmojiPicker.List.Cell onClick={(e) => emoji.unified === "1f600" && e.preventEmojiPickerHandler()} />}</EmojiPicker.List.Items>
                </EmojiPicker.List.Section>
              )}
            </EmojiPicker.List>
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    const click = (u: string) => React.act(() => (document.querySelector(`[data-unified="${u}"]`) as HTMLElement | null)?.click());
    click("1f600");
    click("1f603");
    expect(onSelect.mock.calls.map(([s]) => s.unified)).toEqual(["1f603"]);
  });

  it("clears the query from a Search.Clear placed beside the input", () => {
    const onQueryChange = vi.fn();
    render(
      <EmojiProvider data={en} prepare={false} storage={{ frequents: null, skinTone: null }}>
        <EmojiPicker.Root defaultQuery="smile" onQueryChange={onQueryChange}>
          <EmojiPicker.Search>
            <EmojiPicker.Search.Input>{[]}</EmojiPicker.Search.Input>
            <EmojiPicker.Search.Clear />
          </EmojiPicker.Search>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    React.act(() => (document.querySelector('[data-slot="emoji-picker-search-clear"]') as HTMLElement).click());
    expect(onQueryChange).toHaveBeenCalledWith("", expect.objectContaining({ reason: "clear-press" }));
    expect(document.querySelector('[data-slot="emoji-picker-search-clear"]')).toBeNull();
  });

  it("renders a List.Variations placed in Root in place of the default, styled by its state", () => {
    const actions = React.createRef<EmojiPickerActions>();
    render(
      <EmojiProvider data={en} prepare={false} storage={{ frequents: null, skinTone: null }}>
        <EmojiPicker.Root frequent={false} actionsRef={actions}>
          <EmojiPicker.Search />
          <EmojiPicker.Viewport>
            <EmojiPicker.List />
            <EmojiPicker.List.Variations className={({ emoji }) => `tones-${emoji.unified}`} />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    const search = document.querySelector<HTMLInputElement>('[data-slot="emoji-picker-search-input"]')!;
    React.act(() => search.focus());
    React.act(() => actions.current!.highlight("1f44d"));
    press(search, " ", { shiftKey: true });
    const popups = document.querySelectorAll('[data-slot="emoji-picker-variations"]');
    expect([popups.length, popups[0]?.className, popups[0]?.querySelectorAll('[data-slot="emoji-picker-variation"]').length]).toEqual([1, "tones-1f44d", 6]);
  });
});
