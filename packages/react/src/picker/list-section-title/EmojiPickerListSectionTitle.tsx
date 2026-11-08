"use client";

import * as React from "react";
import { createLeafComponent } from "react-aria/CollectionBuilder";
import { mergeRefs } from "react-aria/mergeRefs";
import { flag, renderElement, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiPickerPartElementProps } from "../../internals/types";
import { useCells } from "../list/EmojiPickerListContext";
import type { EmojiPickerListSectionState } from "../list-section/EmojiPickerListSection";
import { TITLE, useEmojiPickerListSectionContext } from "../list-section/EmojiPickerListSectionContext";
import * as EmojiPickerListSectionTitleDataAttributes from "./EmojiPickerListSectionTitleDataAttributes";

export type EmojiPickerListSectionTitleState = EmojiPickerListSectionState;

export type EmojiPickerListSectionTitleProps = EmojiPickerPartElementProps<EmojiPickerListSectionTitleState, HTMLElement>;

// A collection leaf, as React Aria's Header: List renders it in the section's sticky title
export const EmojiPickerListSectionTitle = createLeafComponent(TITLE, function EmojiPickerListSectionTitle({ children, style, ...props }: EmojiPickerListSectionTitleProps, ref: React.ForwardedRef<HTMLElement>) {
  const { section, headingProps } = useEmojiPickerListSectionContext("SectionTitle");
  const { headers } = useCells("SectionTitle");
  const element = React.useRef<HTMLElement | null>(null);
  const register = React.useCallback(
    (el: HTMLElement | null) => {
      if (element.current) headers.delete(element.current);
      element.current = el;
      if (el) headers.add(el);
    },
    [headers],
  );
  const refs = React.useMemo(() => mergeRefs<HTMLElement>(register, ref), [register, ref]);
  return renderElement(
    "header",
    {
      ...headingProps,
      // Before the slot, so the rendered attributes keep their order
      className: props.className,
      "data-slot": SLOTS.sectionTitle,
      [EmojiPickerListSectionTitleDataAttributes.collapsed]: flag(section.collapsed),
      ...props,
      style: (s: EmojiPickerListSectionTitleState) => ({ height: "var(--ep-header)", ...resolve(style, s) }),
      ref: refs,
      children: children ?? section.name,
    },
    { section, collapsed: section.collapsed },
  );
});

export declare namespace EmojiPickerListSectionTitle {
  type Props = EmojiPickerListSectionTitleProps;
  type State = EmojiPickerListSectionTitleState;
}
