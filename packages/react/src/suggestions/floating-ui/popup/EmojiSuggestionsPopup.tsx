"use client";

import * as React from "react";
import { useMergeRefs } from "@floating-ui/react";
import { mergePartProps } from "../../../internals/mergePartProps";
import { renderElement } from "../../../internals/renderElement";
import { SLOTS } from "../../../internals/slots";
import { useEmojiPopoverPositionerContext } from "../../../popover/floating-ui/positioner/EmojiPopoverPositionerContext";
import { popupAttributes } from "../../../popover/utils/popupAttributes";
import type { EmojiSuggestionsPopupProps, EmojiSuggestionsPopupState } from "../../utils/types";
import { useEmojiSuggestionsRootContext } from "../root/EmojiSuggestionsRootContext";

export const EmojiSuggestionsPopup = React.forwardRef<HTMLDivElement, EmojiSuggestionsPopupProps>(function EmojiSuggestionsPopup({ className, style, render, children, ...props }, ref) {
  const { popup } = useEmojiSuggestionsRootContext("Popup");
  const { state: placed, status, floatingProps } = useEmojiPopoverPositionerContext("EmojiSuggestions");
  const refs = useMergeRefs([popup, ref]);
  const state: EmojiSuggestionsPopupState = { ...placed, transitionStatus: status };
  return renderElement(
    "div",
    {
      ...floatingProps(mergePartProps(props, { onMouseDown: (e: React.MouseEvent) => e.preventDefault() })),
      ...popupAttributes(state),
      "data-slot": SLOTS.suggestionsPopup,
      ref: refs,
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
