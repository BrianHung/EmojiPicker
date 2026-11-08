"use client";

import * as React from "react";
import { mergePartProps } from "../../internals/mergePartProps";
import { renderElement } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import type { EmojiPickerPartElementProps } from "../../internals/types";
import { useInteraction } from "../../internals/useInteraction";
import { EmojiPickerCategoryNavContext, EmojiPickerCategoryNavTabContext } from "../category-nav/EmojiPickerCategoryNavContext";
import type { EmojiPickerNavCategory } from "../root/utils/useCategoryNavigation";
import { DefaultCategoryIcon } from "./DefaultCategoryIcon";

export type EmojiPickerCategoryNavTabState = { category: EmojiPickerNavCategory; selected: boolean; active: boolean; focused: boolean; focusVisible: boolean; hovered: boolean; pressed: boolean; disabled: boolean };

export type EmojiPickerCategoryNavTabProps = EmojiPickerPartElementProps<EmojiPickerCategoryNavTabState, HTMLDivElement, "role">;

export const EmojiPickerCategoryNavTab = React.forwardRef<HTMLDivElement, EmojiPickerCategoryNavTabProps>(function EmojiPickerCategoryNavTab({ children, ...props }, ref) {
  const nav = React.useContext(EmojiPickerCategoryNavContext);
  const c = React.useContext(EmojiPickerCategoryNavTabContext);
  const { disabled = true, choose, selected: current, id } = nav ?? {};
  const interaction = useInteraction({ disabled, onPress: (e) => c && choose?.(c.id, e.pointerType === "keyboard" || e.pointerType === "virtual") });
  if (!nav || !c) throw new Error("EmojiPicker.CategoryNavTab must be inside EmojiPicker.CategoryNav.");
  const selected = c.id === current;
  const state: EmojiPickerCategoryNavTabState = { ...interaction.state, category: c, selected, active: selected && !disabled };
  return renderElement(
    "div",
    {
      "data-slot": SLOTS.categoryTab,
      id: `${id}-tab-${c.id}`,
      role: "button",
      "aria-label": c.name,
      "aria-current": selected || undefined,
      "aria-disabled": disabled || undefined,
      // One tab stop, on the section in view; React Aria's Toolbar moves among the rest with the arrows
      tabIndex: disabled ? undefined : selected ? 0 : -1,
      className: "",
      ...mergePartProps(props, interaction.props),
      ref,
      "data-key": c.id,
      children: children ?? c.icon ?? <DefaultCategoryIcon category={c.id} />,
    },
    state,
    ["focused", "active"],
  );
});

export declare namespace EmojiPickerCategoryNavTab {
  type Props = EmojiPickerCategoryNavTabProps;
  type State = EmojiPickerCategoryNavTabState;
}
