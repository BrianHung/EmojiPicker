"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { withoutTone } from "@emoji-components/core";
import { nameWithTone } from "@emoji-components/core/internal";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { Glyph, useOverridden } from "../../emoji/Glyph";
import { useStoreSnapshot } from "../../provider/EmojiProviderContext";
import { mergePartProps } from "../../internals/mergePartProps";
import { useInteraction, type Clickable } from "../../internals/useInteraction";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import type { EmojiPickerInteractionState, EmojiPickerPartElementProps } from "../../internals/types";
import { SLOTS } from "../../internals/slots";

import { useEmojiPickerReactionsContext } from "../reactions/EmojiPickerReactionsContext";
import * as EmojiPickerReactionsItemDataAttributes from "./EmojiPickerReactionsItemDataAttributes";

export type EmojiPickerReactionsItemState = EmojiPickerInteractionState & { selected: boolean };

export type EmojiPickerReactionsItemProps = EmojiPickerPartElementProps<EmojiPickerReactionsItemState, HTMLButtonElement, "onChange"> & {
  emoji: string;
};

export const EmojiPickerReactionsItem = React.forwardRef<HTMLButtonElement, EmojiPickerReactionsItemProps>(function EmojiPickerReactionsItem({ emoji: unified, style, children, ...props }, ref) {
  const picker = useEmojiPickerRootContext("EmojiPicker.ReactionsItem");
  const row = useEmojiPickerReactionsContext("Item");
  const record = useStoreSnapshot((s) => s.get(unified));
  const overridden = useOverridden(unified, record);
  const selected = Boolean(row.pressed?.has(withoutTone(unified)));
  const { onClick, ...own } = mergePartProps<Clickable>(props, { onClick: (e: React.MouseEvent) => row.press(unified, e.nativeEvent) });
  const interaction = useInteraction({ onClick });
  return renderElement(
    "button",
    {
      type: "button",
      "aria-label": nameWithTone(record?.name ?? unified, unified, picker.labels.withSkinTone),
      "aria-pressed": row.pressed ? selected : undefined,
      ...mergeProps(own, interaction.props),
      ref,
      "data-slot": SLOTS.emoji,
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
