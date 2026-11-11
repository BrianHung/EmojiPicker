"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { Glyph, useOverridden } from "../../emoji/Glyph";
import { useStoreSnapshot } from "../../provider/EmojiProviderContext";
import { useInteraction } from "../../internals/useInteraction";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import type { EmojiComponentsInteractionState, EmojiComponentsPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

import { useEmojiPickerReactionsContext } from "../reactions/EmojiPickerReactionsContext";
import * as EmojiPickerReactionsItemDataAttributes from "./EmojiPickerReactionsItemDataAttributes";

export type EmojiPickerReactionsItemState = EmojiComponentsInteractionState & { selected: boolean };

export type EmojiPickerReactionsItemProps = EmojiComponentsPartElementProps<EmojiPickerReactionsItemState, HTMLButtonElement, "onChange"> & {
  emoji: string;
};

export const EmojiPickerReactionsItem = React.forwardRef<HTMLButtonElement, EmojiPickerReactionsItemProps>(function EmojiPickerReactionsItem({ emoji: unified, style, children, ...props }, ref) {
  const row = useEmojiPickerReactionsContext("Item");
  const record = useStoreSnapshot((s) => s.get(unified));
  const overridden = useOverridden(unified, record);
  const { onClick, ...item } = row.getItemProps(unified, { ...props, ref });
  const selected = Boolean(item["aria-pressed"]);
  const interaction = useInteraction({ onClick });
  return renderElement(
    "button",
    {
      ...mergeProps(item, interaction.props),
      "data-slot": SLOTS.reactionsItem,
      [EmojiPickerReactionsItemDataAttributes.unified]: unified,
      [EmojiPickerReactionsItemDataAttributes.overridden]: flag(overridden),
      [EmojiPickerReactionsItemDataAttributes.selected]: flag(selected),
      style: (s: EmojiPickerReactionsItemState) => ({ maxWidth: "var(--ep-cell)", maxHeight: "var(--ep-cell)", ...resolve(style, s) }),
      children: children ?? <Glyph unified={unified} record={record} />,
    },
    { ...interaction.state, selected },
  );
});

export declare namespace EmojiPickerReactionsItem {
  type Props = EmojiPickerReactionsItemProps;
  type State = EmojiPickerReactionsItemState;
}
