"use client";

import * as React from "react";
import { SLOTS } from "../../internals/slots";
import { EmojiPickerReactionsExpand } from "../reactions-expand/EmojiPickerReactionsExpand";
import { EmojiPickerReactionsItems } from "../reactions-items/EmojiPickerReactionsItems";
import { EmojiPickerReactionsContext } from "../reactions/EmojiPickerReactionsContext";
import type { EmojiComponentsHandlers, EmojiComponentsPartProps } from "../../internals/types";
import { renderElement } from "../../internals/renderElement";
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

export const EmojiPickerReactions = React.forwardRef<HTMLDivElement, EmojiPickerReactionsProps>(function EmojiPickerReactions({ value, defaultValue, onValueChange, children, ...props }, ref) {
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
    <EmojiPickerReactionsContext.Provider value={reactions}>{renderElement("div", { ...reactions.getToolbarProps({ ...props, ref }), "data-slot": SLOTS.reactions, children: content }, HORIZONTAL)}</EmojiPickerReactionsContext.Provider>
  );
});

export declare namespace EmojiPickerReactions {
  type Props = EmojiPickerReactionsProps;
  type State = EmojiPickerReactionsState;
  type ChangeEventReason = EmojiPickerReactionsChangeEventReason;
  type ChangeEventDetails = EmojiPickerReactionsChangeEventDetails;
}
