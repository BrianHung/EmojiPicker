"use client";

import * as React from "react";
import { useListBoxSection } from "react-aria/useListBox";
import type { EmojiItem, EmojiSection } from "@brianhung/emoji-picker-core";
import { EmojiPickerListCell } from "../../list-cell/EmojiPickerListCell";
import { EmojiPickerListSection } from "../../list-section/EmojiPickerListSection";
import { EmojiPickerListSectionContext, partsOf } from "../../list-section/EmojiPickerListSectionContext";
import { EmojiPickerListSectionTitle } from "../../list-section-title/EmojiPickerListSectionTitle";
import { ItemContext, TemplatesContext } from "../EmojiPickerListContext";

export const defaultSection = () => <EmojiPickerListSection />;

// The virtualizer's views render the collection's nodes, as React Aria's DefaultCollectionRenderer does: node.render(node), with defaults for parts a section leaves out
export function SectionView({ section }: { section: EmojiSection }) {
  const templates = React.useContext(TemplatesContext);
  const node = templates?.getItem(section.id);
  const { headingProps, groupProps } = useListBoxSection({ heading: section.header ? section.name : undefined, "aria-label": section.header ? undefined : section.name });
  const parts = React.useMemo(() => partsOf(templates, section.id), [templates, section.id]);
  const value = React.useMemo(() => ({ section, parts, groupProps, headingProps }), [section, parts, groupProps, headingProps]);
  return <EmojiPickerListSectionContext.Provider value={value}>{node?.render?.(node) ?? null}</EmojiPickerListSectionContext.Provider>;
}

export function SectionHeader() {
  const { title } = React.useContext(EmojiPickerListSectionContext)?.parts ?? {};
  return title?.render ? title.render(title) : <EmojiPickerListSectionTitle />;
}

export function ItemView({ item }: { item: EmojiItem }) {
  const template = (React.useContext(EmojiPickerListSectionContext)?.parts.items?.props as { children?: (emoji: EmojiItem) => React.ReactNode } | undefined)?.children;
  return <ItemContext.Provider value={item}>{template ? template(item) : <EmojiPickerListCell />}</ItemContext.Provider>;
}
