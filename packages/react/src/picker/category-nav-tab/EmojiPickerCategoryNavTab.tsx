"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { renderElement } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import { useInteraction } from "../../internals/useInteraction";
import { EmojiPickerCategoryNavContext, EmojiPickerCategoryNavTabContext } from "../category-nav/EmojiPickerCategoryNavContext";
import type { EmojiPickerNavCategory } from "../root/utils/useEmojiPickerCategories";
import { EmojiPickerCategoryNavIcon } from "../category-nav-icon/EmojiPickerCategoryNavIcon";

export type EmojiPickerCategoryNavTabState = { category: EmojiPickerNavCategory; active: boolean; focused: boolean; focusVisible: boolean; hovered: boolean; pressed: boolean; disabled: boolean };

export type EmojiPickerCategoryNavTabProps = EmojiComponentsPartElementProps<EmojiPickerCategoryNavTabState, HTMLDivElement, "role">;

export const EmojiPickerCategoryNavTab = React.forwardRef<HTMLDivElement, EmojiPickerCategoryNavTabProps>(function EmojiPickerCategoryNavTab({ children, ...props }, ref) {
  const nav = React.useContext(EmojiPickerCategoryNavContext);
  const c = React.useContext(EmojiPickerCategoryNavTabContext);
  const disabled = nav?.disabled ?? true;
  const tab = nav && c ? nav.getItemProps(c.id, props) : null;
  const interaction = useInteraction({ disabled, onClick: tab?.onClick });
  if (!nav || !c || !tab) throw new Error("EmojiPicker.CategoryNavTab must be inside EmojiPicker.CategoryNav.");
  const { onClick, ...item } = tab;
  const selected = Boolean(item["aria-current"]);
  const state: EmojiPickerCategoryNavTabState = { ...interaction.state, category: c, active: selected && !disabled };
  return renderElement(
    "div",
    {
      id: `${nav.id}-tab-${c.id}`,
      className: "",
      ...mergeProps(item, interaction.props),
      ref,
      "data-slot": SLOTS.categoryNavTab,
      children: children ?? c.icon ?? <EmojiPickerCategoryNavIcon />,
    },
    state,
    ["focused", "active"],
  );
});

export declare namespace EmojiPickerCategoryNavTab {
  type Props = EmojiPickerCategoryNavTabProps;
  type State = EmojiPickerCategoryNavTabState;
}
