"use client";

import * as React from "react";

import { useEmojiPickerReactionsContext } from "../reactions/EmojiPickerReactionsContext";
import { EmojiPickerReactionsItem } from "../reactions-item/EmojiPickerReactionsItem";

export type EmojiPickerReactionsItemsProps = { children?: (emoji: string) => React.ReactNode };

export function EmojiPickerReactionsItems({ children }: EmojiPickerReactionsItemsProps) {
  const { reactions } = useEmojiPickerReactionsContext("Items");
  return reactions.map((unified) => <React.Fragment key={unified}>{children ? children(unified) : <EmojiPickerReactionsItem emoji={unified} />}</React.Fragment>);
}

export declare namespace EmojiPickerReactionsItems {
  type Props = EmojiPickerReactionsItemsProps;
}
