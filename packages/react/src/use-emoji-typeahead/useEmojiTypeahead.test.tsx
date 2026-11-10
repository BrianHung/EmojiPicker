// @vitest-environment jsdom
import * as React from "react";
import { expect, it, vi } from "vitest";
import { render } from "../../test/render";
import { en } from "../../test/en";
import { EmojiProvider, useEmojiTypeahead, useTextFieldEmojiTypeahead, type EmojiSelection, type EmojiTypeahead } from "..";

const shown = ({ open, suggestions }: EmojiTypeahead) => (open ? suggestions.suggestions[0]?.shortcode : "closed");

function TextField({ onSelect }: { onSelect?: (selection: EmojiSelection) => void }) {
  const ref = React.useRef<HTMLInputElement>(null);
  const typeahead = useTextFieldEmojiTypeahead(ref, { onSelect });
  return (
    <>
      <input ref={ref} aria-label="Message" defaultValue=":thumbs" />
      <output>{shown(typeahead)}</output>
    </>
  );
}

function Editor({ query }: { query: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const typeahead = useEmojiTypeahead({ query, anchor: () => null, replace: () => {} }, {}, ref);
  return (
    <div ref={ref} contentEditable suppressContentEditableWarning>
      {shown(typeahead)}
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
