"use client";

import * as React from "react";
import type { Collection, Node } from "@react-types/shared";
import type { EmojiItem } from "@emoji-components/core";
import type { Cells } from "../list-cell/utils/useEmojiPickerCell";

export const CellsContext = React.createContext<Cells | null>(null);
export const HorizontalContext = React.createContext(false);
// The collection CollectionBuilder builds from List's children: a branch per section, keyed by section id, with its parts as leaves
export const TemplatesContext = React.createContext<Collection<Node<unknown>> | null>(null);
export const ItemContext = React.createContext<EmojiItem | null>(null);

export function useCells(part: string): Cells {
  const cells = React.useContext(CellsContext);
  if (!cells) throw new Error(`EmojiPicker.List${part} must be inside EmojiPicker.List.`);
  return cells;
}
