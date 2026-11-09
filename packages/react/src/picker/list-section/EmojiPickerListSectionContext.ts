"use client";

import * as React from "react";
import type { Collection, Key, Node } from "@react-types/shared";
import type { EmojiSection } from "@emoji-components/core";

// Collection node types for a section's parts, built by React Aria's CollectionBuilder from List's children
export const SECTION = "emoji-picker-list-section";
export const TITLE = "emoji-picker-list-section-title";
export const ITEMS = "emoji-picker-list-items";
export const ACTIONS = "emoji-picker-list-section-actions";

export type SectionParts = { title?: Node<unknown>; items?: Node<unknown>; actions?: Node<unknown> };

export const partsOf = (templates: Collection<Node<unknown>> | null, key: Key): SectionParts => {
  const parts: SectionParts = {};
  for (const node of templates?.getChildren?.(key) ?? []) {
    if (node.type === TITLE) parts.title ??= node;
    else if (node.type === ITEMS) parts.items ??= node;
    else if (node.type === ACTIONS) parts.actions ??= node;
  }
  return parts;
};

export interface EmojiPickerListSectionContext {
  section: EmojiSection;
  parts: SectionParts;
  groupProps: React.HTMLAttributes<HTMLElement>;
  headingProps: React.HTMLAttributes<HTMLElement>;
}

export const EmojiPickerListSectionContext = React.createContext<EmojiPickerListSectionContext | null>(null);

export function useEmojiPickerListSectionContext(part: string): EmojiPickerListSectionContext {
  const data = React.useContext(EmojiPickerListSectionContext);
  if (!data) throw new Error(`EmojiPicker.List${part} must be in an EmojiPicker.ListSection, inside EmojiPicker.List's children.`);
  return data;
}
