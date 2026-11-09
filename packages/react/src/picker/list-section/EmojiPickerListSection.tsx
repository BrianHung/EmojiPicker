"use client";

import type * as React from "react";
import { createBranchComponent } from "react-aria/CollectionBuilder";
import type { EmojiSection } from "@emoji-components/core";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import { useCells } from "../list/EmojiPickerListContext";
import { VirtualBranch } from "../list/utils/VirtualCollection";
import * as EmojiPickerListSectionDataAttributes from "./EmojiPickerListSectionDataAttributes";
import { SECTION, useEmojiPickerListSectionContext } from "./EmojiPickerListSectionContext";

export type EmojiPickerListSectionState = { section: EmojiSection; collapsed: boolean };

export type EmojiPickerListSectionProps = Omit<EmojiComponentsPartElementProps<EmojiPickerListSectionState, HTMLElement>, "children"> & {
  children?: React.ReactNode;
};

// A collection branch, as React Aria's ListBoxSection: its children are the section's parts, and List renders it in the section's place
export const EmojiPickerListSection = createBranchComponent(SECTION, function EmojiPickerListSection({ children: _, style, ...props }: EmojiPickerListSectionProps, ref: React.ForwardedRef<HTMLElement>) {
  const cells = useCells("Section");
  const { section, groupProps } = useEmojiPickerListSectionContext("Section");
  return renderElement(
    "section",
    {
      ...groupProps,
      id: cells.sectionDomId(section.id),
      "data-slot": SLOTS.listSection,
      [EmojiPickerListSectionDataAttributes.category]: section.category,
      [EmojiPickerListSectionDataAttributes.collapsed]: flag(section.collapsed),
      ...props,
      style: (s: EmojiPickerListSectionState) => ({ height: "100%", ...resolve(style, s) }),
      ref,
      children: <VirtualBranch parent={section.id} />,
    },
    { section, collapsed: section.collapsed },
  );
});

export declare namespace EmojiPickerListSection {
  type Props = EmojiPickerListSectionProps;
  type State = EmojiPickerListSectionState;
}
