// @vitest-environment jsdom
import * as React from "react";
import { I18nProvider } from "react-aria/I18nProvider";
import { describe, expect, it, vi } from "vitest";
import { createTestRoot, render } from "../../../test/render";
import { en } from "../../../test/en";
import { EmojiPicker, EmojiProvider, useEmojiPickerCell, useEmojiPickerGrid, useEmojiSkinTone, type EmojiPickerGridState, type EmojiItem } from "../..";

function Cell({ state, item }: { state: EmojiPickerGridState; item: EmojiItem }) {
  return <div {...useEmojiPickerCell(state, item).cellProps} />;
}

function Grid() {
  const grid = useEmojiPickerGrid({ rowHeight: 40, columns: 8 });
  return <div {...grid.getGridProps()}>{grid.rows.slice(0, 3).flatMap((row) => (row.type === "emojis" ? row.items.map((item) => <Cell key={item.id} state={grid.state} item={item} />) : []))}</div>;
}

function mount(props: Partial<EmojiPicker.Root.Props>) {
  const input = document.body.appendChild(document.createElement("input"));
  const host = document.body.appendChild(document.createElement("div"));
  const root = createTestRoot(host);
  const actions = React.createRef<EmojiPicker.Root.Actions>();
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
    press(host.querySelector<HTMLElement>('[data-slot="emoji-picker"]')!, "Escape");
    allow = true;
    press(host.querySelector<HTMLElement>('[data-slot="emoji-picker"]')!, "Escape");
    document.removeEventListener("keydown", reached);
    expect(reached).toHaveBeenCalledTimes(1);
  });

  it("reports whether the keyboard or the pointer moved the highlight", () => {
    const onHighlightChange = vi.fn();
    const { input, host } = mount({ onHighlightChange });
    press(input, "ArrowRight");
    expect(onHighlightChange).toHaveBeenLastCalledWith("1f600", expect.objectContaining({ reason: "keyboard", key: "smileys-people:1f600" }));
    React.act(() => void host.querySelector('[data-unified="1f604"]')!.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: 9, clientY: 9 })));
    expect(onHighlightChange).toHaveBeenLastCalledWith("1f604", expect.objectContaining({ reason: "pointer" }));
  });

  it("keeps a key move when the pointer moves again over the cell it was on, as VoiceOver's pointer does", () => {
    const { input, host } = mount({});
    const move = (unified: string, at: number) => React.act(() => void host.querySelector(`[data-unified="${unified}"]`)!.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: at, clientY: at })));
    move("1f600", 1);
    press(input, "ArrowRight");
    move("1f600", 2);
    expect(highlighted(host)).toBe("1f603");
    move("1f604", 3);
    expect(highlighted(host)).toBe("1f604");
  });

  it("leaves a controlled highlight to its owner", () => {
    const onHighlightChange = vi.fn();
    const { input, host } = mount({ highlight: "smileys-people:1f600", onHighlightChange });
    press(input, "ArrowRight");
    expect(onHighlightChange).toHaveBeenLastCalledWith("1f603", expect.objectContaining({ reason: "keyboard", key: "smileys-people:1f603" }));
    expect(highlighted(host)).toBe("1f600");
    expect(host.querySelector<HTMLElement>('[data-slot="emoji-picker"]')!.hasAttribute("highlight")).toBe(false);
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
            <EmojiPicker.Root categories={[{ id: "smileys-people", name }, { id: "animals-nature" }]}>{parts}</EmojiPicker.Root>
          </EmojiProvider>,
        ),
      );
    show("Faces");
    show("People");
    expect(host.querySelector('[data-slot="emoji-picker-category-nav-tab"]')?.getAttribute("aria-label")).toBe("People");
  });

  it("runs onKeyDown first, and preventEmojiComponentsHandler skips the picker's handler", () => {
    const onQueryChange = vi.fn();
    const { host } = mount({ defaultQuery: "smile", onQueryChange, onKeyDown: (e) => e.shiftKey || e.preventEmojiComponentsHandler() });
    const root = host.querySelector<HTMLElement>('[data-slot="emoji-picker"]')!;
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
      const [, set] = useEmojiSkinTone();
      setTone.current = (t) => set(t);
      return null;
    }
    const input = document.body.appendChild(document.createElement("input"));
    const actions = React.createRef<EmojiPicker.Root.Actions>();
    render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root frequent={false} keyboardTarget={input} actionsRef={actions} onHighlightChange={onHighlightChange} onSelect={onSelect}>
          <ToneSetter />
          <Grid />
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    input.focus();
    React.act(() => actions.current!.highlight("1f44d"));
    expect(onHighlightChange).toHaveBeenLastCalledWith("1f44d", expect.objectContaining({ key: "smileys-people:1f44d" }));
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

  it("skips a cell's pick when its onClick calls preventEmojiComponentsHandler", () => {
    const onSelect = vi.fn();
    render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root frequent={false} onSelect={onSelect}>
          <EmojiPicker.Viewport>
            <EmojiPicker.List>
              {() => (
                <EmojiPicker.ListSection>
                  <EmojiPicker.ListItems>{(emoji) => <EmojiPicker.ListCell onClick={(e) => emoji.unified === "1f600" && e.preventEmojiComponentsHandler()} />}</EmojiPicker.ListItems>
                </EmojiPicker.ListSection>
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

  it("clears the query from a SearchClear placed beside the input", () => {
    const onQueryChange = vi.fn();
    render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root defaultQuery="smile" onQueryChange={onQueryChange}>
          <EmojiPicker.Search>
            <EmojiPicker.SearchInput>{[]}</EmojiPicker.SearchInput>
            <EmojiPicker.SearchClear />
          </EmojiPicker.Search>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    React.act(() => (document.querySelector('[data-slot="emoji-picker-search-clear"]') as HTMLElement).click());
    expect(onQueryChange).toHaveBeenCalledWith("", expect.objectContaining({ reason: "clear-press" }));
    expect(document.querySelector('[data-slot="emoji-picker-search-clear"]')).toBeNull();
  });

  it("announces the result count in a SearchStatus in place of Root's own live region", () => {
    render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root defaultQuery="smile">
          <EmojiPicker.Search>
            <EmojiPicker.SearchInput />
            <EmojiPicker.SearchStatus className={({ resultCount }) => `count-${resultCount}`} />
          </EmojiPicker.Search>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    const statuses = document.querySelectorAll('[role="status"]');
    expect(statuses).toHaveLength(1);
    expect(statuses[0]!.textContent).toMatch(/\d+ results?/);
    expect(statuses[0]!.className).toMatch(/^count-\d+$/);
  });

  it("renders a ListVariations placed in Root in place of the default, styled by its state", () => {
    const actions = React.createRef<EmojiPicker.Root.Actions>();
    render(
      <EmojiProvider data={en} prepare={false}>
        <EmojiPicker.Root frequent={false} actionsRef={actions}>
          <EmojiPicker.Search />
          <EmojiPicker.Viewport>
            <EmojiPicker.List />
            <EmojiPicker.ListVariations className={({ emoji }) => `tones-${emoji.unified}`} />
          </EmojiPicker.Viewport>
        </EmojiPicker.Root>
      </EmojiProvider>,
    );
    const search = document.querySelector<HTMLInputElement>('[data-slot="emoji-picker-search-input"]')!;
    React.act(() => search.focus());
    React.act(() => actions.current!.highlight("1f44d"));
    press(search, " ", { shiftKey: true });
    const popups = document.querySelectorAll('[data-slot="emoji-picker-list-variations"]');
    expect([popups.length, popups[0]?.className, popups[0]?.querySelectorAll('[data-slot="emoji-picker-list-variations-option"]').length]).toEqual([1, "tones-1f44d", 6]);
  });

  it("moves through the skin tones with RTL arrows, Home and End, and picks with Enter", () => {
    const actions = React.createRef<EmojiPicker.Root.Actions>();
    const onSelect = vi.fn();
    render(
      <I18nProvider locale="he">
        <EmojiProvider data={en} prepare={false}>
          <EmojiPicker.Root frequent={false} actionsRef={actions} onSelect={onSelect}>
            <EmojiPicker.Search />
            <EmojiPicker.Viewport>
              <EmojiPicker.List />
            </EmojiPicker.Viewport>
          </EmojiPicker.Root>
        </EmojiProvider>
      </I18nProvider>,
    );
    const search = document.querySelector<HTMLInputElement>('[data-slot="emoji-picker-search-input"]')!;
    React.act(() => search.focus());
    React.act(() => actions.current!.highlight("1f44d"));
    press(search, " ", { shiftKey: true });
    const focused = () => (document.activeElement as HTMLElement).dataset.unified;
    const keys = ["ArrowLeft", "End", "Home", "ArrowRight"].map((key) => (press(document.activeElement!, key), focused()));
    expect([document.activeElement!.closest('[role="listbox"]')?.getAttribute("aria-orientation"), ...keys]).toEqual(["horizontal", "1f44d-1f3fb", "1f44d-1f3ff", "1f44d", "1f44d-1f3ff"]);
    press(document.activeElement!, "Enter");
    expect(onSelect).toHaveBeenCalledWith(expect.objectContaining({ unified: "1f44d-1f3ff" }), expect.objectContaining({ event: expect.any(KeyboardEvent) }));
  });
});
