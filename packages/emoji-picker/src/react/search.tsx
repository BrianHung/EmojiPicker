// EmojiPicker.Search: React Aria's SearchField. With focusModel "input" it sits in
// Root's Autocomplete, so keys move a virtual highlight through the List while focus
// stays here; with "grid", Down moves focus into the cells.
import * as React from "react";
import { Button } from "react-aria-components/Button";
import { Input } from "react-aria-components/Input";
import { SearchField } from "react-aria-components/SearchField";
import { usePicker } from "./context";
import { mergeRefs, useKeyRegion, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import { SLOTS } from "./slots";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "autoFocus" | "placeholder" | "aria-controls" | "role" | "children" | "dangerouslySetInnerHTML" | "onKeyDown">;

export type SearchProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "onKeyDown" | "dangerouslySetInnerHTML"> & {
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
  /** Attributes for the input; the picker owns its value. */
  inputProps?: InputProps & { onKeyDown?: PickerKeyboardEventHandler<HTMLInputElement> };
  inputRef?: React.Ref<HTMLInputElement>;
};

const caretAtEnd = (field: HTMLInputElement) => field.selectionStart === field.value.length && field.selectionEnd === field.value.length;

/** The search field and its input: the picker's query, its keys, and the clear button. */
function Field({ inputProps, inputRef, as, children }: { inputProps?: SearchProps["inputProps"]; inputRef?: React.Ref<HTMLInputElement>; as?: React.ElementType; children?: React.ReactNode }) {
  const picker = usePicker("EmojiPicker.Search");
  const { labels, focusModel, components } = picker;
  React.useLayoutEffect(picker.registerSearch, [picker.registerSearch]);
  const { onKeyDown: onInputKeyDown, className, ...input } = inputProps ?? {};
  const fieldRef = React.useRef<HTMLDivElement | null>(null);
  const ownInput = React.useRef<HTMLInputElement | null>(null);

  const region = useKeyRegion((action, event) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement) || !action) return "pass";
    const rtl = getComputedStyle(field).direction === "rtl";
    const back = rtl ? "move-right" : "move-left";
    // Left and Right edit the query unless the caret is at its end.
    if ((action === "move-left" || action === "move-right") && !caretAtEnd(field)) return "native";
    const list = picker.list.current;
    if (!list) return "pass";
    if (focusModel === "grid") {
      const forward = rtl ? "move-left" : "move-right";
      return (action === "move-down" || (picker.searching && action === forward)) && list.focus() ? "handled" : "pass";
    }
    // Left from the first emoji goes back to editing the text.
    if (action === back && list.atStart()) return "native";
    return list.key(action, "input", event) ? "handled" : "pass";
  });
  // The input's handler, then the Search row's, as bubbling would call them.
  const userKeys = useUserKeyDown(onInputKeyDown as PickerKeyboardEventHandler | undefined);

  React.useEffect(() => {
    if (picker.autoFocusSearch && !fieldRef.current?.closest('[data-slot="popover-content"]')) ownInput.current?.focus({ preventScroll: true });
  }, []);

  const Clear = components.ClearButton;
  const field = (
    <SearchField
      ref={mergeRefs(fieldRef, region)}
      data-slot={SLOTS.searchField}
      aria-label={labels.searchLabel}
      className=""
      {...(focusModel === "grid" ? { value: picker.query, onChange: picker.setQuery } : {})}
    >
      {({ isEmpty }) => (
        <>
          <Input
            {...input}
            {...(as ? { render: (props: object) => React.createElement(as, props) } : {})}
            ref={mergeRefs(ownInput, inputRef, userKeys)}
            type="text"
            role="searchbox"
            className={className ?? ""}
            placeholder={labels.searchPlaceholder}
            aria-label={input["aria-label"] ?? labels.searchLabel}
            data-slot={SLOTS.searchInput}
            // An EmojiPopover focuses it once visible (autoFocus misses a hidden field).
            {...(picker.autoFocusSearch ? { "data-autofocus": "" } : {})}
          />
          {/* Only with a query to clear: whatever a theme's styles, an empty field has no button. */}
          {!isEmpty && (
            <Button aria-label={labels.searchClear} data-slot={SLOTS.searchClear} className="" {...{ title: labels.searchClear }} render={Clear ? (props) => <Clear {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)} /> : undefined}>
              ×
            </Button>
          )}
          {children}
        </>
      )}
    </SearchField>
  );
  return field;
}

export const Search = React.forwardRef<HTMLDivElement, SearchProps>(function Search({ inputProps, inputRef, onKeyDown, children, ...props }, ref) {
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs(ref, userKeys), [ref, userKeys]);
  return (
    <div data-slot={SLOTS.search} {...props} ref={merged}>
      <Field inputProps={inputProps} inputRef={inputRef} />
      {children}
    </div>
  );
});

export type SearchInputProps = SearchProps["inputProps"] & {
  /** Render this element instead of <input> (a design system's input that forwards its ref and props). */
  as?: React.ElementType;
};

/** The search field on its own, for a custom search row. */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({ as, ...props }, ref) {
  return <Field inputProps={props} inputRef={ref} as={as} />;
});

