"use client";

import type * as React from "react";
import { createLeafComponent } from "react-aria/CollectionBuilder";
import type { EmojiItem } from "@emoji-components/core";
import { ITEMS } from "../list-section/EmojiPickerListSectionContext";

export type EmojiPickerListItemsProps = {
  children?: (emoji: EmojiItem) => React.ReactNode;
};

// A collection leaf holding the cell template: List calls it for each emoji in view
export const EmojiPickerListItems = createLeafComponent(ITEMS, function EmojiPickerListItems(_: EmojiPickerListItemsProps) {
  return null;
});

export declare namespace EmojiPickerListItems {
  type Props = EmojiPickerListItemsProps;
}
