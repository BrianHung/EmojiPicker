// EmojiPicker.Search: a row around React Aria's SearchField (Search.Input). With focusModel
// "input" it sits in Root's Autocomplete, so keys move a virtual highlight through the List
// while focus stays here; with "grid", Down moves focus into the cells.
import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { Button, type ButtonRenderProps } from "react-aria-components/Button";
import { Input, type InputRenderProps } from "react-aria-components/Input";
import { SearchField } from "react-aria-components/SearchField";
import { usePicker } from "./context";
import { useKeyRegion, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import { useEmojiPopover } from "./popover-context";
import { racClassName, renderElement, toRenderFunction, type PartElementProps, type PartProps } from "./render";
import { SLOTS } from "./slots";

export type SearchState = { empty: boolean };

export type SearchProps = PartElementProps<SearchState, HTMLDivElement, "role" | "onKeyDown" | "dangerouslySetInnerHTML"> & {
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
};

/** The search row: `Search.Input` by default, or your own composition around it. */
const SearchRoot = React.forwardRef<HTMLDivElement, SearchProps>(function Search({ onKeyDown, children, ...props }, ref) {
  const { query } = usePicker("EmojiPicker.Search");
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs(ref, userKeys), [ref, userKeys]);
  return renderElement("div", { "data-slot": SLOTS.search, ...props, ref: merged, children: children ?? <SearchInput /> }, { empty: query === "" });
});

export type SearchInputState = InputRenderProps;

export type SearchInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "aria-controls" | "role" | "children" | "dangerouslySetInnerHTML" | "onKeyDown" | "className" | "style"> &
  PartProps<SearchInputState> & {
    /** Runs before the picker handles the key; see Root's `onKeyDown`. */
    onKeyDown?: PickerKeyboardEventHandler<HTMLInputElement>;
    /** Inside the field, after the input. Default: `Search.Clear`. */
    children?: React.ReactNode;
  };

const caretAtEnd = (field: HTMLInputElement) => field.selectionStart === field.value.length && field.selectionEnd === field.value.length;

const EmptyContext = React.createContext(true);

/** The search field: the picker's query and its keys. Placeholder and focus on mount default to Root's. */
const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({ onKeyDown, className, render, placeholder, autoFocus, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Search.Input");
  const { labels, focusModel } = picker;
  React.useLayoutEffect(picker.registerSearch, [picker.registerSearch]);
  const own = React.useRef<HTMLInputElement | null>(null);
  const focusOnMount = autoFocus ?? picker.autoFocusSearch;

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
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);

  const inEmojiPopover = useEmojiPopover() !== null;
  React.useEffect(() => {
    if (focusOnMount && !inEmojiPopover) own.current?.focus({ preventScroll: true });
  }, []);

  return (
    <SearchField ref={region} data-slot={SLOTS.searchField} aria-label={labels.searchLabel} className="" {...(focusModel === "grid" ? { value: picker.query, onChange: picker.setQuery } : {})}>
      {({ isEmpty }) => (
        <EmptyContext.Provider value={isEmpty}>
          <Input
            {...props}
            ref={mergeRefs<HTMLInputElement>(own, ref, userKeys)}
            type="text"
            role="searchbox"
            className={racClassName(className)}
            render={toRenderFunction(render) as never}
            placeholder={placeholder ?? labels.searchPlaceholder}
            aria-label={props["aria-label"] ?? labels.searchLabel}
            data-slot={SLOTS.searchInput}
            // An EmojiPopover focuses it once visible (autoFocus misses a hidden field).
            {...(focusOnMount ? { "data-autofocus": "" } : {})}
          />
          {children ?? <SearchClear />}
        </EmptyContext.Provider>
      )}
    </SearchField>
  );
});

export type SearchClearState = ButtonRenderProps;
export type SearchClearProps = PartElementProps<SearchClearState, HTMLButtonElement, "onClick">;

/** Clears the query; rendered only while there is one. */
const SearchClear = React.forwardRef<HTMLButtonElement, SearchClearProps>(function SearchClear({ className, render, children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Search.Clear");
  if (React.useContext(EmptyContext)) return null;
  return (
    <Button {...(props as object)} ref={ref} aria-label={labels.searchClear} data-slot={SLOTS.searchClear} className={racClassName(className)} render={toRenderFunction(render) as never} {...{ title: labels.searchClear }}>
      {children ?? "×"}
    </Button>
  );
});

export const Search = Object.assign(SearchRoot, { Input: SearchInput, Clear: SearchClear });
