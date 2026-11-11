"use client";

import * as React from "react";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { SLOTS } from "../../internals/slots";
import { EmojiPickerReactionsExpand } from "../reactions-expand/EmojiPickerReactionsExpand";
import { EmojiPickerReactionsItems } from "../reactions-items/EmojiPickerReactionsItems";
import { EmojiPickerReactionsContext } from "../reactions/EmojiPickerReactionsContext";
import { BUTTONS } from "../../utils/dom";
import type { EmojiComponentsHandlers, EmojiComponentsPartProps } from "../../internals/types";
import { ToolbarPart } from "../utils/ToolbarPart";
import type { EmojiPickerOrientation } from "../utils/types";
import { type EmojiPickerReactionsChangeEventDetails, type EmojiPickerReactionsChangeEventReason, type UseEmojiPickerReactionsOptions, useEmojiPickerReactions } from "./utils/useEmojiPickerReactions";

export type { EmojiPickerReactionsChangeEventDetails, EmojiPickerReactionsChangeEventReason };

export type EmojiPickerReactionsState = { orientation: EmojiPickerOrientation };

export type EmojiPickerReactionsProps = EmojiComponentsHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style" | "children" | "defaultValue">> &
  EmojiComponentsPartProps<EmojiPickerReactionsState, HTMLDivElement> &
  UseEmojiPickerReactionsOptions & {
    children?: React.ReactNode | ((emoji: string) => React.ReactNode);
  };

const HORIZONTAL: EmojiPickerReactionsState = { orientation: "horizontal" };

// Once focus is inside, the pointer carries it from button to button
const POINTER: React.HTMLAttributes<HTMLElement> = {
  onPointerOver(event) {
    const button = event.target instanceof Element ? event.target.closest<HTMLElement>(BUTTONS) : null;
    const active = document.activeElement;
    const row = event.currentTarget;
    if (button && button !== active && row.contains(button) && active instanceof HTMLElement && row.contains(active)) button.focus({ preventScroll: true });
  },
};

export const EmojiPickerReactions = React.forwardRef<HTMLDivElement, EmojiPickerReactionsProps>(function EmojiPickerReactions({ value, defaultValue, onValueChange, children, ...props }, ref) {
  const { labels } = useEmojiPickerRootContext("EmojiPicker.Reactions");
  const reactions = useEmojiPickerReactions({ value, defaultValue, onValueChange });
  if (!reactions.open) return null;
  const content =
    typeof children === "function" || children === undefined ? (
      <>
        <EmojiPickerReactionsItems>{children}</EmojiPickerReactionsItems>
        <EmojiPickerReactionsExpand />
      </>
    ) : (
      children
    );
  return (
    <EmojiPickerReactionsContext.Provider value={reactions}>
      <ToolbarPart aria-label={labels.reactions} {...props} data-slot={SLOTS.reactions} toolbarRef={ref} orientation="horizontal" state={HORIZONTAL} handlers={POINTER}>
        {content}
      </ToolbarPart>
    </EmojiPickerReactionsContext.Provider>
  );
});

export declare namespace EmojiPickerReactions {
  type Props = EmojiPickerReactionsProps;
  type State = EmojiPickerReactionsState;
  type ChangeEventReason = EmojiPickerReactionsChangeEventReason;
  type ChangeEventDetails = EmojiPickerReactionsChangeEventDetails;
}
