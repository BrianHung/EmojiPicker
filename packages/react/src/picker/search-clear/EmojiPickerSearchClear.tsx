"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergePartProps } from "../../internals/mergePartProps";
import { renderElement } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiPickerInteractionState, EmojiPickerPartElementProps } from "../../internals/types";
import { type Clickable, useInteraction } from "../../internals/useInteraction";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { useQueryEmpty } from "../utils/useQueryEmpty";

export type EmojiPickerSearchClearState = EmojiPickerInteractionState;
export type EmojiPickerSearchClearProps = EmojiPickerPartElementProps<EmojiPickerSearchClearState, HTMLButtonElement>;

// Clears the query from anywhere in Root, and keeps focus in the search field
export const EmojiPickerSearchClear = React.forwardRef<HTMLButtonElement, EmojiPickerSearchClearProps>(function EmojiPickerSearchClear({ children, ...props }, ref) {
  const picker = useEmojiPickerRootContext("EmojiPicker.SearchClear");
  const empty = useQueryEmpty("EmojiPicker.SearchClear");
  const { onClick, ...own } = mergePartProps<Clickable>(props, {
    onClick: (e: React.MouseEvent) => {
      picker.state.setQuery("", { reason: "clear-press", event: e.nativeEvent });
      picker.searchInput.current?.focus();
    },
  });
  const interaction = useInteraction({ preventFocusOnPress: true, onClick });
  if (empty) return null;
  return renderElement(
    "button",
    {
      type: "button",
      tabIndex: -1,
      title: picker.labels.searchClear,
      "aria-label": picker.labels.searchClear,
      ...mergeProps(own, interaction.props),
      ref,
      "data-slot": SLOTS.searchClear,
      children: children ?? "×",
    },
    interaction.state,
  );
});

export declare namespace EmojiPickerSearchClear {
  type Props = EmojiPickerSearchClearProps;
  type State = EmojiPickerSearchClearState;
}
