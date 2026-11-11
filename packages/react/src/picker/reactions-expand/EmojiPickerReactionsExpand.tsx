"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { useInteraction } from "../../internals/useInteraction";
import { renderElement } from "../../internals/renderElement";
import type { EmojiComponentsInteractionState, EmojiComponentsPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

import { useEmojiPickerReactionsContext } from "../reactions/EmojiPickerReactionsContext";

export type EmojiPickerReactionsExpandState = EmojiComponentsInteractionState;
export type EmojiPickerReactionsExpandProps = EmojiComponentsPartElementProps<EmojiPickerReactionsExpandState, HTMLButtonElement>;

export const EmojiPickerReactionsExpand = React.forwardRef<HTMLButtonElement, EmojiPickerReactionsExpandProps>(function EmojiPickerReactionsExpand({ children, ...props }, ref) {
  const row = useEmojiPickerReactionsContext("Expand");
  const { onClick, ...expand } = row.getExpandProps({ ...props, ref });
  const interaction = useInteraction({ onClick });
  if (!row.expandable) return null;
  return renderElement(
    "button",
    {
      ...mergeProps(expand, interaction.props),
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
