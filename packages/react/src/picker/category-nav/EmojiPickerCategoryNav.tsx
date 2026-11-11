"use client";

// A toolbar of jump links, not tabs: the sections are virtualized, so there are no tab panels to control, and "Frequently used" may have no tab
import * as React from "react";
import { flag, resolve } from "../../internals/renderElement";
import { SLOTS } from "../../internals/slots";
import { ToolbarPart } from "../utils/ToolbarPart";
import type { EmojiComponentsHandlers, EmojiComponentsPartProps } from "../../internals/types";
import type { EmojiPickerOrientation } from "../utils/types";
import { useStore } from "../../utils/useStore";
import { EmojiPickerCategoryNavTab } from "../category-nav-tab/EmojiPickerCategoryNavTab";
import { useEmojiPickerRootContext } from "../root/EmojiPickerRootContext";
import { type EmojiPickerNavCategory, useEmojiPickerCategories } from "../root/utils/useEmojiPickerCategories";
import * as EmojiPickerCategoryNavDataAttributes from "./EmojiPickerCategoryNavDataAttributes";
import { type EmojiPickerCategoryNavContext as NavContext, EmojiPickerCategoryNavContext, EmojiPickerCategoryNavTabContext } from "./EmojiPickerCategoryNavContext";

export type EmojiPickerCategoryNavState = { orientation: EmojiPickerOrientation; disabled: boolean };

export type EmojiPickerCategoryNavProps = EmojiComponentsHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "className" | "style" | "dangerouslySetInnerHTML">> &
  EmojiComponentsPartProps<EmojiPickerCategoryNavState, HTMLDivElement> & {
    orientation?: EmojiPickerOrientation;
    children?: (category: EmojiPickerNavCategory) => React.ReactNode;
  };

export const EmojiPickerCategoryNav = React.forwardRef<HTMLDivElement, EmojiPickerCategoryNavProps>(function EmojiPickerCategoryNav({ orientation = "horizontal", style, children, ...props }, ref) {
  const picker = useEmojiPickerRootContext("EmojiPicker.CategoryNav");
  const disabled = useStore(picker.state, (s) => s.searching);
  const { categories, getItemProps } = useEmojiPickerCategories();
  const id = React.useId();
  if (categories.length <= 1) return null;
  const nav: NavContext = { id, disabled, getItemProps };
  const state: EmojiPickerCategoryNavState = { orientation, disabled };
  return (
    <EmojiPickerCategoryNavContext.Provider value={nav}>
      <ToolbarPart
        {...props}
        id={id}
        toolbarRef={ref}
        aria-label={picker.labels.categoryNavigation}
        orientation={orientation}
        state={state}
        style={(s: EmojiPickerCategoryNavState) => ({ pointerEvents: s.disabled ? "none" : undefined, ...resolve(style, s) })}
        data-slot={SLOTS.categoryNav}
        {...{ [EmojiPickerCategoryNavDataAttributes.disabled]: flag(disabled) }}
      >
        {categories.map((c) => (
          <EmojiPickerCategoryNavTabContext.Provider key={c.id} value={c}>
            {children ? children(c) : <EmojiPickerCategoryNavTab />}
          </EmojiPickerCategoryNavTabContext.Provider>
        ))}
      </ToolbarPart>
    </EmojiPickerCategoryNavContext.Provider>
  );
});

export declare namespace EmojiPickerCategoryNav {
  type Props = EmojiPickerCategoryNavProps;
  type State = EmojiPickerCategoryNavState;
}
