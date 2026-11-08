"use client";

import * as React from "react";
import { createLeafComponent } from "react-aria/CollectionBuilder";
import { mergeRefs } from "react-aria/mergeRefs";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiPickerPartElementProps } from "../../internals/types";
import type { EmojiPickerListSectionState } from "../list-section/EmojiPickerListSection";
import { ACTIONS } from "../list-section/EmojiPickerListSectionContext";
import * as EmojiPickerListSectionActionsDataAttributes from "./EmojiPickerListSectionActionsDataAttributes";
import { EmojiPickerListSectionActionsContext } from "./EmojiPickerListSectionActionsContext";

export type EmojiPickerListSectionActionsState = EmojiPickerListSectionState & {
  toggle: () => void;
  toggleProps: { "aria-expanded": boolean };
};

export type EmojiPickerListSectionActionsProps = EmojiPickerPartElementProps<EmojiPickerListSectionActionsState>;

// A collection leaf: List renders it over the list, outside the listbox, pinned with its section's sticky title
export const EmojiPickerListSectionActions = createLeafComponent(ACTIONS, function EmojiPickerListSectionActions({ style, children, ...props }: EmojiPickerListSectionActionsProps, ref: React.ForwardedRef<HTMLDivElement>) {
  const place = React.useContext(EmojiPickerListSectionActionsContext);
  const block = place?.block;
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(ref, block), [ref, block]);
  if (!place) return null;
  const { section, top, height, headerHeight, toggle } = place;
  const state: EmojiPickerListSectionActionsState = { section, collapsed: section.collapsed, toggle, toggleProps: { "aria-expanded": !section.collapsed } };
  return (
    <div style={{ position: "absolute", top, insetInlineStart: 0, width: "100%", height }}>
      {renderElement(
        "div",
        {
          ...props,
          ref: refs,
          "data-slot": SLOTS.sectionActions,
          [EmojiPickerListSectionActionsDataAttributes.section]: section.id,
          [EmojiPickerListSectionActionsDataAttributes.collapsed]: flag(section.collapsed),
          style: (s: EmojiPickerListSectionActionsState) => ({ position: "sticky", top: "var(--ep-sticky-offset, 0px)", height: headerHeight, zIndex: 3, pointerEvents: "auto", ...resolve(style, s) }),
          children,
        },
        state,
      )}
    </div>
  );
});

export declare namespace EmojiPickerListSectionActions {
  type Props = EmojiPickerListSectionActionsProps;
  type State = EmojiPickerListSectionActionsState;
}
