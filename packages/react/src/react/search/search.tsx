import * as React from "react";
import { useLocale } from "react-aria/I18nProvider";
import { mergeRefs } from "react-aria/mergeRefs";
import { Button } from "react-aria-components/Button";
import { Input } from "react-aria-components/Input";
import { SearchField } from "react-aria-components/SearchField";
import { usePicker } from "../root/context";
import { useKeyRegion, useUserKeyDown, type PickerKeyboardEventHandler } from "../root/keyboard";
import { racParts, racState, renderElement, type InteractionState, type PartElementProps, type PartProps } from "../utils/render";
import { SLOTS } from "../utils/slots";

export type SearchState = { empty: boolean };

export type SearchProps = PartElementProps<SearchState, HTMLDivElement, "role" | "onKeyDown" | "dangerouslySetInnerHTML"> & {
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
};

const SearchRoot = React.forwardRef<HTMLDivElement, SearchProps>(function Search({ onKeyDown, children, ...props }, ref) {
  const { query } = usePicker("EmojiPicker.Search");
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const merged = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, userKeys), [ref, userKeys]);
  return renderElement("div", { "data-slot": SLOTS.search, "data-empty": query === "" || undefined, ...props, ref: merged, children: children ?? <SearchInput /> }, { empty: query === "" });
});

export type SearchInputState = Omit<InteractionState, "pressed">;

export type SearchInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "aria-controls" | "role" | "children" | "dangerouslySetInnerHTML" | "onKeyDown" | "className" | "style"> &
  PartProps<SearchInputState, HTMLInputElement> & {
    onKeyDown?: PickerKeyboardEventHandler<HTMLInputElement>;
    children?: React.ReactNode;
  };

const caretAtEnd = (field: HTMLInputElement) => field.selectionStart === field.value.length && field.selectionEnd === field.value.length;

const EmptyContext = React.createContext(true);

const FIELD: React.CSSProperties = { position: "relative", flex: "1 1 auto", alignSelf: "stretch", display: "flex", alignItems: "center", minWidth: 0 };

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({ onKeyDown, className, style, render, placeholder, autoFocus, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Search.Input");
  const { labels, focusModel } = picker;
  React.useLayoutEffect(picker.registerSearch, [picker.registerSearch]);
  const own = React.useRef<HTMLInputElement | null>(null);
  const focusOnMount = autoFocus ?? picker.inPopover;
  const clear = React.useMemo(() => <SearchClear />, []);
  const rtl = useLocale().direction === "rtl";

  const region = useKeyRegion((action, event) => {
    const field = event.target;
    if (!(field instanceof HTMLInputElement) || !action) return "pass";
    const back = rtl ? "move-right" : "move-left";
    if ((action === "move-left" || action === "move-right") && !caretAtEnd(field)) return "native";
    const list = picker.list.current;
    if (!list) return "pass";
    if (focusModel === "grid") {
      const forward = rtl ? "move-left" : "move-right";
      return (action === "move-down" || (picker.searching && action === forward)) && list.focus() ? "handled" : "pass";
    }
    if (action === back && list.atStart()) return "native";
    return list.key(action, "input", event) ? "handled" : "pass";
  });
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);

  React.useEffect(() => {
    if (focusOnMount && !picker.inPopover) own.current?.focus({ preventScroll: true });
  }, []);

  return (
    <SearchField ref={region} data-slot={SLOTS.searchField} aria-label={labels.searchLabel} className="" style={FIELD} {...(focusModel === "grid" ? { value: picker.query, onChange: picker.setQuery } : {})}>
      {({ isEmpty }) => (
        <EmptyContext.Provider value={isEmpty}>
          <Input
            {...props}
            ref={mergeRefs<HTMLInputElement>(own, picker.searchInput, ref, userKeys)}
            type="text"
            role="searchbox"
            {...racParts<InteractionState, HTMLInputElement>({ className, style, render })}
            placeholder={placeholder ?? labels.searchPlaceholder}
            aria-label={props["aria-label"] ?? labels.searchLabel}
            data-slot={SLOTS.searchInput}
            // autoFocus misses a field that is still hidden while the popover opens
            {...(focusOnMount ? { "data-autofocus": "" } : {})}
          />
          {children ?? clear}
        </EmptyContext.Provider>
      )}
    </SearchField>
  );
});

export type SearchClearState = InteractionState;
export type SearchClearProps = PartElementProps<SearchClearState, HTMLButtonElement, "onClick">;

const SearchClear = React.forwardRef<HTMLButtonElement, SearchClearProps>(function SearchClear({ className, style, render, children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Search.Clear");
  if (React.useContext(EmptyContext)) return null;
  return (
    <Button {...(props as object)} ref={ref} aria-label={labels.searchClear} data-slot={SLOTS.searchClear} {...racParts({ className, style, render })} {...{ title: labels.searchClear }}>
      {typeof children === "function" ? (r) => children(racState(r)) : (children ?? "×")}
    </Button>
  );
});

export const Search = Object.assign(SearchRoot, { Input: SearchInput, Clear: SearchClear });
