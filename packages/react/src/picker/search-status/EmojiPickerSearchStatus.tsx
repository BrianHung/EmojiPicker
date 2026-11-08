"use client";

import * as React from "react";
import { renderElement } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiPickerPartElementProps } from "../../internals/types";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import { useStore } from "../../utils/useStore";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";

export type EmojiPickerSearchStatusState = { resultCount: number | null };
export type EmojiPickerSearchStatusProps = EmojiPickerPartElementProps<EmojiPickerSearchStatusState, HTMLDivElement, "role">;

// Base UI's Combobox.Status: the result count's live region, for placing and styling it; without one, Root renders a visually hidden one
export const EmojiPickerSearchStatus = React.forwardRef<HTMLDivElement, EmojiPickerSearchStatusProps>(function EmojiPickerSearchStatus({ children, ...props }, ref) {
  const picker = useEmojiPickerRootContext("EmojiPicker.SearchStatus");
  const resultCount = useStore(picker.state, (s) => (s.searching && !s.pending ? s.results.length : null));
  const register = picker.registerStatus;
  useLayoutEffect(() => register(), [register]);
  const state: EmojiPickerSearchStatusState = { resultCount };
  return renderElement(
    "div",
    { role: "status", "aria-live": "polite", "aria-atomic": true, "data-slot": SLOTS.searchStatus, ...props, ref, children: children ?? (resultCount === null ? "" : picker.labels.resultCount(resultCount)) },
    state,
  );
});

export declare namespace EmojiPickerSearchStatus {
  type Props = EmojiPickerSearchStatusProps;
  type State = EmojiPickerSearchStatusState;
}
