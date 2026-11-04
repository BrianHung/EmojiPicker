// Root's search for focusModel "input": React Aria's useAutocomplete between the Search
// input and the List. Focus stays in the field; the List's highlight is virtual focus
// (aria-activedescendant), and keys the picker leaves alone reach the list through it.
import * as React from "react";
import { useAutocomplete, type AutocompleteAria } from "react-aria/useAutocomplete";

export type AutocompleteValue = {
  inputProps: AutocompleteAria<unknown>["inputProps"];
  inputRef: React.RefObject<HTMLInputElement | null>;
  collectionProps: AutocompleteAria<unknown>["collectionProps"];
  collectionRef: React.Ref<HTMLElement>;
  /** Clears the field's aria-activedescendant. */
  clearFocusedNode(): void;
};

export const AutocompleteContext = React.createContext<AutocompleteValue | null>(null);

export function Autocomplete({ inputValue, onInputChange, children }: { inputValue: string; onInputChange: (value: string) => void; children: React.ReactNode }) {
  const [focusedNodeId, setFocusedNodeId] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const collectionRef = React.useRef<HTMLElement | null>(null);
  const state = { inputValue, setInputValue: onInputChange, focusedNodeId, setFocusedNodeId };
  const { inputProps, collectionProps, collectionRef: ref } = useAutocomplete({ inputRef, collectionRef, disableAutoFocusFirst: true }, state);
  const value: AutocompleteValue = { inputProps, inputRef, collectionProps, collectionRef: ref, clearFocusedNode: () => setFocusedNodeId(null) };
  return <AutocompleteContext.Provider value={value}>{children}</AutocompleteContext.Provider>;
}
