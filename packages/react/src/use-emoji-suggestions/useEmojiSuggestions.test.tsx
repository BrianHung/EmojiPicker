// @vitest-environment jsdom
import * as React from "react";
import { expect, it, vi } from "vitest";
import { render } from "../../test/render";
import { en } from "../../test/en";
import { EmojiProvider, useEmojiSuggestions, useTextFieldEmojiSuggestions, type EmojiSelection, type UseEmojiSuggestionsReturnValue } from "..";

const shown = ({ open, suggestions }: UseEmojiSuggestionsReturnValue) => (open ? suggestions[0]?.shortcode : "closed");

function TextField({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const suggestions = useTextFieldEmojiSuggestions({ onSelect }, ref);
  return (
    <>
      <input ref={ref} aria-label="Message" defaultValue=":thumbs" />
      <output>{shown(suggestions)}</output>
    </>
  );
}

function Editor({ query }: { query: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const suggestions = useEmojiSuggestions({ trigger: { query, anchor: () => null, replace: () => {} }, element: ref });
  return (
    <div ref={ref} contentEditable suppressContentEditableWarning>
      {shown(suggestions)}
    </div>
  );
}

const keydown = (el: Element, key: string, init: KeyboardEventInit = {}) => {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, ...init });
  React.act(() => void el.dispatchEvent(event));
  return event.defaultPrevented;
};

// jsdom has no execCommand, ResizeObserver or Range layout; the text field inserts and measures with them
Object.assign(document, { execCommand: () => true });
Object.assign(globalThis, {
  ResizeObserver: class {
    observe() {}
    disconnect() {}
  },
});
Object.assign(Range.prototype, { getBoundingClientRect: () => new DOMRect() });

function mountTextField(onSelect = vi.fn()) {
  const host = render(
    <EmojiProvider data={en} prepare={false}>
      <TextField onSelect={onSelect} />
    </EmojiProvider>,
  );
  return { input: host.querySelector("input")!, output: host.querySelector("output")!, onSelect };
}

it("suggests only while the text field is focused", () => {
  const { input, output } = mountTextField();
  expect(output.textContent).toBe("closed");
  input.setSelectionRange(7, 7);
  React.act(() => input.focus());
  expect(output.textContent).toBe("thumbsup");
  React.act(() => input.blur());
  expect(output.textContent).toBe("closed");
});

it("accepts with Enter and Tab, not Shift+Tab or a composing Enter", () => {
  const { input, onSelect } = mountTextField();
  input.setSelectionRange(7, 7);
  React.act(() => input.focus());
  expect(keydown(input, "Enter", { isComposing: true })).toBe(false);
  expect(keydown(input, "Tab", { shiftKey: true })).toBe(false);
  expect(onSelect).not.toHaveBeenCalled();
  expect(keydown(input, "Tab")).toBe(true);
  expect(keydown(input, "Enter")).toBe(true);
  expect(onSelect.mock.calls.map(([s]) => s.unified)).toEqual(["1f44d", "1f44d"]);
});

it("labels the list from labels.suggestions", () => {
  function List() {
    return <ul {...useEmojiSuggestions({ trigger: null }).getListProps()} />;
  }
  const host = render(
    <EmojiProvider data={en} prepare={false} labels={{ suggestions: "Sugerencias de emoji" }}>
      <List />
    </EmojiProvider>,
  );
  expect(host.querySelector("ul")!.getAttribute("aria-label")).toBe("Sugerencias de emoji");
});

it("dismisses when the editor blurs, until the query changes", () => {
  let setQuery = (_: string) => {};
  function App() {
    const [query, set] = React.useState("thumbs");
    setQuery = set;
    return <Editor query={query} />;
  }
  const host = render(
    <EmojiProvider data={en} prepare={false}>
      <App />
    </EmojiProvider>,
  );
  const editor = host.querySelector<HTMLElement>("[contenteditable]")!;
  React.act(() => editor.focus());
  expect(editor.getAttribute("aria-expanded")).toBe("true");
  React.act(() => editor.blur());
  expect(editor.textContent).toBe("closed");
  React.act(() => setQuery("fire"));
  expect(editor.textContent).toBe("fire");
});

it("wires a field that spreads getInputProps, keeps its attributes after the menu closes, and anchors at the query", () => {
  function Field() {
    const ref = React.useRef<HTMLInputElement>(null);
    const { getInputProps, anchor } = useTextFieldEmojiSuggestions();
    return <input aria-label="Message" defaultValue=":thumbs" {...getInputProps({ ref })} data-anchored={String(anchor.contextElement === ref.current)} />;
  }
  const host = render(
    <EmojiProvider data={en} prepare={false}>
      <Field />
    </EmojiProvider>,
  );
  const input = host.querySelector("input")!;
  const wiring = () => ["role", "aria-expanded", "aria-controls"].map((name) => input.getAttribute(name));
  input.setSelectionRange(7, 7);
  React.act(() => input.focus());
  expect(wiring()).toEqual(["combobox", "true", expect.stringMatching(/listbox$/)]);
  expect(input.dataset.anchored).toBe("true");
  React.act(() => input.blur());
  expect(wiring()).toEqual(["combobox", "false", null]);
});

it("moves the highlight once per key, from the field's own listener or getInputProps' onKeyDown", () => {
  const trigger = { query: "smile", anchor: () => null, replace: () => {} };
  const Field = ({ suggestions }: { suggestions: UseEmojiSuggestionsReturnValue }) => <input aria-label="Message" defaultValue=":smile" data-index={suggestions.highlightedIndex} {...suggestions.getInputProps()} />;
  const TextField = () => <Field suggestions={useTextFieldEmojiSuggestions()} />;
  const Editor = () => <Field suggestions={useEmojiSuggestions({ trigger })} />;
  for (const Hooked of [TextField, Editor]) {
    const input = render(
      <EmojiProvider data={en} prepare={false}>
        <Hooked />
      </EmojiProvider>,
    ).querySelector("input")!;
    input.setSelectionRange(6, 6);
    React.act(() => input.focus());
    expect(keydown(input, "ArrowDown")).toBe(true);
    expect(input.dataset.index).toBe("1");
  }
});
