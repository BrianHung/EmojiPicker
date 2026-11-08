"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { ReactionsContext, useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { mergePartProps } from "../../internals/mergePartProps";
import { useInteraction, type Clickable } from "../../internals/useInteraction";
import { renderElement } from "../../internals/renderElement";
import type { EmojiPickerInteractionState, EmojiPickerPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

import { useEmojiPickerReactionsContext } from "../reactions/EmojiPickerReactionsContext";

export type EmojiPickerReactionsExpandState = EmojiPickerInteractionState;
export type EmojiPickerReactionsExpandProps = EmojiPickerPartElementProps<EmojiPickerReactionsExpandState, HTMLButtonElement>;

export const EmojiPickerReactionsExpand = React.forwardRef<HTMLButtonElement, EmojiPickerReactionsExpandProps>(function EmojiPickerReactionsExpand({ children, ...props }, ref) {
  const { labels } = useEmojiPickerRootContext("EmojiPicker.ReactionsExpand");
  const state = React.useContext(ReactionsContext);
  useEmojiPickerReactionsContext("Expand");
  const { onClick, ...own } = mergePartProps<Clickable>(props, { onClick: (e: React.MouseEvent) => state?.expand?.(e.nativeEvent) });
  const interaction = useInteraction({ onClick });
  if (!state?.expand) return null;
  return renderElement(
    "button",
    {
      type: "button",
      title: labels.expandReactions,
      "aria-label": labels.expandReactions,
      // A disclosure for the Panel; Escape with no query collapses back to this row
      "aria-expanded": false,
      "aria-controls": state.panelId,
      ...mergeProps(own, interaction.props),
      ref,
      "data-slot": SLOTS.reactionsExpand,
      children: children ?? (
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <path d="M12 5v14M5 12h14" />
        </svg>
      ),
    },
    interaction.state,
  );
});

export declare namespace EmojiPickerReactionsExpand {
  type Props = EmojiPickerReactionsExpandProps;
  type State = EmojiPickerReactionsExpandState;
}
