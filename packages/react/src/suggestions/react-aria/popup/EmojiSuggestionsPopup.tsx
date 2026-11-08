"use client";

import * as React from "react";
import { mergePartProps } from "../../../internals/mergePartProps";
import { renderElement } from "../../../internals/renderElement";
import { SLOTS } from "../../../internals/slots";
import { useEmojiPopoverPositionerContext } from "../../../popover/react-aria/positioner/EmojiPopoverPositionerContext";
import { popupAttributes } from "../../../popover/utils/popupAttributes";
import type { EmojiSuggestionsPopupProps, EmojiSuggestionsPopupState } from "../../../popover/utils/types";

export const EmojiSuggestionsPopup = React.forwardRef<HTMLDivElement, EmojiSuggestionsPopupProps>(function EmojiSuggestionsPopup({ className, style, render, children, ...props }, ref) {
  const { state: placed, status } = useEmojiPopoverPositionerContext("EmojiSuggestions");
  const state: EmojiSuggestionsPopupState = { ...placed, transitionStatus: status };
  return renderElement(
    "div",
    {
      ...mergePartProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }),
      ...popupAttributes(state),
      "data-slot": SLOTS.suggestionsPopup,
      ref,
      className,
      style,
      render,
      children,
    },
    state,
  );
});

export declare namespace EmojiSuggestionsPopup {
  type Props = EmojiSuggestionsPopupProps;
  type State = EmojiSuggestionsPopupState;
}
