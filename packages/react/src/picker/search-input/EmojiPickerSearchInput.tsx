"use client";

import * as React from "react";
import { useLocale } from "react-aria/I18nProvider";
import { mergeRefs } from "react-aria/mergeRefs";
import { Input } from "react-aria-components/Input";
import { racParts } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiComponentsHandlers, EmojiComponentsInteractionState, EmojiComponentsPartProps } from "../../internals/types";
import { usePickerKeyDown } from "../../internals/usePickerKeyDown";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { EmojiPickerSearchContext } from "../search/EmojiPickerSearchContext";

export type EmojiPickerSearchInputState = Omit<EmojiComponentsInteractionState, "pressed">;

export type EmojiPickerSearchInputProps = EmojiComponentsHandlers<
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "value" | "defaultValue" | "onChange" | "aria-controls" | "role" | "children" | "dangerouslySetInnerHTML" | "className" | "style">
> &
  EmojiComponentsPartProps<EmojiPickerSearchInputState, HTMLInputElement>;

const caretAtEnd = (field: HTMLInputElement) => field.selectionStart === field.value.length && field.selectionEnd === field.value.length;

export const EmojiPickerSearchInput = React.forwardRef<HTMLInputElement, EmojiPickerSearchInputProps>(function EmojiPickerSearchInput({ onKeyDown, className, style, render, placeholder, autoFocus, ...props }, ref) {
  const picker = useEmojiPickerRootContext("EmojiPicker.SearchInput");
  const { labels } = picker;
  const { registerInput } = picker.state;
  useLayoutEffect(() => registerInput(), [registerInput]);
  const own = React.useRef<HTMLInputElement | null>(null);
  const refs = React.useMemo(() => mergeRefs<HTMLInputElement>(own, picker.searchInput, ref), [picker.searchInput, ref]);
  const inSearch = React.useContext(EmojiPickerSearchContext);
  const rtl = useLocale().direction === "rtl";

  // Capture: React Aria's Autocomplete forwards keys to the list from the input's own keydown
  const keys = usePickerKeyDown<HTMLInputElement>(
    onKeyDown,
    (e) => {
      const field = e.target as HTMLInputElement;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") return !caretAtEnd(field) || (e.key === (rtl ? "ArrowRight" : "ArrowLeft") && Boolean(picker.list.current?.atStart())) ? "native" : false;
      if (e.key === "Home" || e.key === "End") return field.value !== "" && !e.ctrlKey && !e.metaKey ? "native" : false;
      // Before SearchField's own Escape, which clears as an input change and always stops the key
      if (e.key === "Escape" && field.value !== "") {
        picker.state.setQuery("", { reason: "escape-key", event: e.nativeEvent });
        picker.list.current?.clear();
        return true;
      }
      return e.key === " " && e.shiftKey && Boolean(picker.list.current?.variations(null));
    },
    { stopSkipped: true },
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: autoFocus, once on mount
  React.useEffect(() => {
    if (autoFocus) own.current?.focus({ preventScroll: true });
  }, []);

  if (!inSearch) throw new Error("EmojiPicker.SearchInput must be inside EmojiPicker.Search.");
  return (
    <Input
      {...props}
      ref={refs}
      onKeyDownCapture={keys}
      type="text"
      role="searchbox"
      {...racParts<HTMLInputElement>("input", { className, style, render })}
      placeholder={placeholder ?? labels.searchPlaceholder}
      aria-label={props["aria-label"] ?? labels.searchLabel}
      data-slot={SLOTS.searchInput}
      // For emojiPickerInitialFocus: a popover that is still hidden on mount focuses the field once it shows
      {...(autoFocus ? { "data-autofocus": "" } : {})}
    />
  );
});

export declare namespace EmojiPickerSearchInput {
  type Props = EmojiPickerSearchInputProps;
  type State = EmojiPickerSearchInputState;
}
