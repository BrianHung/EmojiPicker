import * as React from "react";
import { useLocale } from "react-aria/I18nProvider";
import { mergeRefs } from "react-aria/mergeRefs";
import { Input } from "react-aria-components/Input";
import { SearchField } from "react-aria-components/SearchField";
import { usePicker } from "../root/context";
import { mergePartProps, type PickerHandlers } from "../utils/events";
import { usePickerKeyDown } from "../utils/keyboard";
import { flag, racParts, renderElement, resolve, type InteractionState, type PartElementProps, type PartProps } from "../utils/render";
import { useInteraction } from "../utils/interaction";
import { SLOTS } from "../utils/slots";
import { useStore } from "../utils/store";
import { useLayoutEffect } from "../utils/utils";

export type SearchState = { empty: boolean };

export type SearchProps = PartElementProps<SearchState, HTMLDivElement, "role" | "dangerouslySetInnerHTML">;

const useEmpty = (part: string) => useStore(usePicker(part).state, (s) => s.query === "");

const SearchRoot = React.forwardRef<HTMLDivElement, SearchProps>(function Search({ onKeyDown, children, ...props }, ref) {
  const empty = useEmpty("EmojiPicker.Search");
  const keys = usePickerKeyDown(onKeyDown, () => false);
  return renderElement("div", { "data-slot": SLOTS.search, "data-empty": flag(empty), ...props, ref, onKeyDown: keys, children: children ?? <SearchInput /> }, { empty });
});

export type SearchFieldState = SearchState;

export type SearchFieldProps = Omit<PartElementProps<SearchFieldState, HTMLDivElement, "role" | "dangerouslySetInnerHTML">, "children"> & { children?: React.ReactNode };

const FieldContext = React.createContext(false);

const FIELD: React.CSSProperties = { position: "relative", flex: "1 1 auto", alignSelf: "stretch", display: "flex", alignItems: "center", minWidth: 0 };

// React Aria's SearchField: Search.Input renders one around itself when it isn't inside a Search.Field
const Field = React.forwardRef<HTMLDivElement, SearchFieldProps>(function SearchFieldPart({ className, style, render, children, ...props }, ref) {
  const { labels } = usePicker("EmojiPicker.Search.Field");
  const empty = useEmpty("EmojiPicker.Search.Field");
  return (
    <SearchField
      {...(props as object)}
      ref={ref}
      data-slot={SLOTS.searchField}
      aria-label={labels.searchLabel}
      className={() => resolve(className, { empty }) ?? ""}
      style={() => ({ ...FIELD, ...resolve(style, { empty }) })}
      render={(dom) => renderElement("div", { ...dom, "data-empty": flag(empty), render }, { empty })}
    >
      <FieldContext.Provider value>{children}</FieldContext.Provider>
    </SearchField>
  );
});

export type SearchInputState = Omit<InteractionState, "pressed">;

export type SearchInputProps = PickerHandlers<Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "aria-controls" | "role" | "children" | "dangerouslySetInnerHTML" | "className" | "style">> &
  PartProps<SearchInputState, HTMLInputElement> & {
    children?: React.ReactNode;
  };

const caretAtEnd = (field: HTMLInputElement) => field.selectionStart === field.value.length && field.selectionEnd === field.value.length;

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput({ onKeyDown, className, style, render, placeholder, autoFocus, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Search.Input");
  const { labels } = picker;
  useLayoutEffect(picker.state.registerInput, [picker.state]);
  const own = React.useRef<HTMLInputElement | null>(null);
  const focusOnMount = autoFocus ?? picker.inPopover;
  const inField = React.useContext(FieldContext);
  const rtl = useLocale().direction === "rtl";

  // Capture: React Aria's Autocomplete forwards keys to the list from the input's own keydown
  const keys = usePickerKeyDown<HTMLInputElement>(
    onKeyDown,
    (e) => {
      const field = e.target as HTMLInputElement;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") return !caretAtEnd(field) || (e.key === (rtl ? "ArrowRight" : "ArrowLeft") && Boolean(picker.list.current?.atStart())) ? "native" : false;
      if (e.key === "Home" || e.key === "End") return field.value !== "" && !e.ctrlKey && !e.metaKey ? "native" : false;
      return e.key === " " && e.shiftKey && Boolean(picker.list.current?.variations(null));
    },
    { stopSkipped: true },
  );

  React.useEffect(() => {
    if (focusOnMount && !picker.inPopover) own.current?.focus({ preventScroll: true });
  }, []);

  const input = (
    <>
      <Input
        {...props}
        ref={mergeRefs<HTMLInputElement>(own, picker.searchInput, ref)}
        onKeyDownCapture={keys}
        type="text"
        role="searchbox"
        {...racParts<InteractionState, HTMLInputElement>("input", { className, style, render })}
        placeholder={placeholder ?? labels.searchPlaceholder}
        aria-label={props["aria-label"] ?? labels.searchLabel}
        data-slot={SLOTS.searchInput}
        // autoFocus misses a field that is still hidden while the popover opens
        {...(focusOnMount ? { "data-autofocus": "" } : {})}
      />
      {children ?? <SearchClear />}
    </>
  );
  return inField ? input : <Field>{input}</Field>;
});

export type SearchClearState = InteractionState;
export type SearchClearProps = PartElementProps<SearchClearState, HTMLButtonElement>;

// Clears the query from anywhere in Root, and keeps focus in the search field
const SearchClear = React.forwardRef<HTMLButtonElement, SearchClearProps>(function SearchClear({ children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.Search.Clear");
  const empty = useEmpty("EmojiPicker.Search.Clear");
  const interaction = useInteraction({ preventFocusOnPress: true });
  if (empty) return null;
  return renderElement(
    "button",
    {
      type: "button",
      tabIndex: -1,
      title: picker.labels.searchClear,
      "aria-label": picker.labels.searchClear,
      ...mergePartProps(props, interaction.props, {
        onClick: (e: React.MouseEvent) => {
          picker.state.setQuery("", { reason: "clear-press", event: e.nativeEvent });
          picker.searchInput.current?.focus();
        },
      }),
      ref,
      "data-slot": SLOTS.searchClear,
      children: children ?? "×",
    },
    interaction.state,
  );
});

export const Search = Object.assign(SearchRoot, { Field, Input: SearchInput, Clear: SearchClear });

export declare namespace Search {
  type Props = SearchProps;
  type State = SearchState;
  namespace Field {
    type Props = SearchFieldProps;
    type State = SearchFieldState;
  }
  namespace Input {
    type Props = SearchInputProps;
    type State = SearchInputState;
  }
  namespace Clear {
    type Props = SearchClearProps;
    type State = SearchClearState;
  }
}
