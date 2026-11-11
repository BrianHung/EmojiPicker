"use client";

import * as React from "react";
import { renderElement } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import { useLayoutEffect } from "../../utils/useLayoutEffect";
import { useEmojiPickerSearch } from "../root/utils/useEmojiPickerSearch";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";

export type EmojiPickerSearchStatusState = { resultCount: number | null };
export type EmojiPickerSearchStatusProps = EmojiComponentsPartElementProps<EmojiPickerSearchStatusState, HTMLDivElement, "role">;

// Base UI's Combobox.Status: the result count's live region, for placing and styling it; without one, Root renders a visually hidden one
export const EmojiPickerSearchStatus = React.forwardRef<HTMLDivElement, EmojiPickerSearchStatusProps>(function EmojiPickerSearchStatus({ children, ...props }, ref) {
  const picker = useEmojiPickerRootContext("EmojiPicker.SearchStatus");
  const { resultCount } = useEmojiPickerSearch();
  const register = picker.registerStatus;
  useLayoutEffect(() => register(), [register]);
  const state: EmojiPickerSearchStatusState = { resultCount };
  return renderElement(
    "div",
    { role: "status", "aria-live": "polite", "aria-atomic": true, ...props, "data-slot": SLOTS.searchStatus, ref, children: children ?? (resultCount === null ? "" : picker.labels.resultCount(resultCount)) },
    state,
  );
});

export declare namespace EmojiPickerSearchStatus {
  type Props = EmojiPickerSearchStatusProps;
  type State = EmojiPickerSearchStatusState;
}
