// EmojiPicker.Search: a search field (React Aria's useTextField). With focusModel "input"
// it is Root's Autocomplete input, so keys move a virtual highlight through the List
// while focus stays here; with "grid", Down moves focus into the cells.
import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { AutocompleteContext, type AutocompleteValue } from "./autocomplete";
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

/** React Aria's input props as DOM props: onChange gets the value; a key stops at the field unless its handler continues it (useKeyboard). */
function inputPropsOf({ onChange, onKeyDown, onKeyUp, ...props }: Partial<AutocompleteValue["inputProps"]>): React.InputHTMLAttributes<HTMLInputElement> {
  const keys = (handler: ((e: never) => void) | undefined) =>
    handler &&
    ((e: React.KeyboardEvent<HTMLInputElement>) => {
      let stop = true;
      handler(Object.assign(e, { continuePropagation: () => void (stop = false) }) as never);
      if (stop) e.stopPropagation();
    });
  return { ...(props as React.InputHTMLAttributes<HTMLInputElement>), onChange: onChange && ((e) => onChange(e.target.value)), onKeyDown: keys(onKeyDown), onKeyUp: keys(onKeyUp) };
}

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

  const autocomplete = React.useContext(AutocompleteContext);
  const field = focusModel === "input" ? autocomplete : null;
  const fieldProps = { ...inputPropsOf(field?.inputProps ?? { value: picker.query, onChange: picker.setQuery }), type: "text", "aria-label": input["aria-label"] ?? labels.searchLabel, placeholder: labels.searchPlaceholder };
  const clear = () => {
    picker.setQuery("");
    ownInput.current?.focus();
  };
  const Clear = components.ClearButton;
  const clearProps: React.ButtonHTMLAttributes<HTMLButtonElement> & { "data-slot": string } = {
    type: "button",
    tabIndex: -1,
    "aria-label": labels.searchClear,
    title: labels.searchClear,
    "data-slot": SLOTS.searchClear,
    className: "",
    // Focus stays in the field (on touch too, so the keyboard stays up).
    onPointerDown: (e) => e.preventDefault(),
    onClick: clear,
    children: "×",
  };
  const Element = (as ?? "input") as React.ElementType;
  return (
    <div ref={mergeRefs(fieldRef, region)} data-slot={SLOTS.searchField} className="" data-empty={picker.query === "" || undefined}>
      <Element
        {...mergeProps(input, fieldProps)}
        ref={mergeRefs(ownInput, inputRef, userKeys, field?.inputRef)}
        role="searchbox"
        className={className ?? ""}
        data-slot={SLOTS.searchInput}
        // An EmojiPopover focuses it once visible (autoFocus misses a hidden field).
        {...(picker.autoFocusSearch ? { "data-autofocus": "" } : {})}
      />
      {/* Only with a query to clear: whatever a theme's styles, an empty field has no button. */}
      {picker.query !== "" && (Clear ? <Clear {...clearProps} /> : <button {...clearProps} />)}
      {children}
    </div>
  );
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

