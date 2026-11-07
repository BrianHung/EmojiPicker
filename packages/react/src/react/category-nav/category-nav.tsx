"use client";

// A toolbar of jump links, not tabs: the sections are virtualized, so there are no tab panels to control, and "Frequently used" may have no tab
import * as React from "react";
import { DefaultCategoryIcon } from "./category-icons";
import { usePicker } from "../root/context";
import { useCategoryNavigation, type EmojiPickerNavCategory } from "../root/hooks";
import { mergePartProps, type EmojiPickerHandlers } from "../utils/events";
import { useInteraction } from "../utils/interaction";
import { flag, renderElement, resolve, type EmojiPickerOrientation, type EmojiPickerPartElementProps, type EmojiPickerPartProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { useStore } from "../utils/store";
import { ToolbarPart } from "../utils/toolbar";

export type { EmojiPickerNavCategory };

export type CategoryNavState = { orientation: EmojiPickerOrientation; disabled: boolean };

export type CategoryNavProps = EmojiPickerHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "className" | "style" | "dangerouslySetInnerHTML">> &
  EmojiPickerPartProps<CategoryNavState, HTMLDivElement> & {
    orientation?: EmojiPickerOrientation;
    children?: (category: EmojiPickerNavCategory) => React.ReactNode;
  };

type Nav = { id: string; selected: string; disabled: boolean; choose(key: string, instant: boolean): void };
const NavContext = React.createContext<Nav | null>(null);
const TabContext = React.createContext<EmojiPickerNavCategory | null>(null);

const CategoryNavRoot = React.forwardRef<HTMLDivElement, CategoryNavProps>(function CategoryNav({ orientation = "horizontal", style, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.CategoryNav");
  const disabled = useStore(picker.state, (s) => s.searching);
  const { categories, activeCategory, jumpToCategory } = useCategoryNavigation();
  const id = React.useId();
  if (categories.length <= 1) return null;
  const selected = activeCategory != null && categories.some((c) => c.id === activeCategory) ? activeCategory : categories[0]!.id;
  const nav: Nav = { id, selected, disabled, choose: (key, instant) => jumpToCategory(key, { instant }) };
  const state: CategoryNavState = { orientation, disabled };
  return (
    <NavContext.Provider value={nav}>
      <ToolbarPart
        {...props}
        id={id}
        toolbarRef={ref}
        aria-label={picker.labels.categoryNavigation}
        orientation={orientation}
        state={state}
        style={(s: CategoryNavState) => ({ pointerEvents: s.disabled ? "none" : undefined, ...resolve(style, s) })}
        data-slot={SLOTS.categoryNav}
        data-disabled={flag(disabled)}
      >
        {categories.map((c) => (
          <TabContext.Provider key={c.id} value={c}>
            {children ? children(c) : <CategoryTab />}
          </TabContext.Provider>
        ))}
      </ToolbarPart>
    </NavContext.Provider>
  );
});

export type CategoryTabState = { category: EmojiPickerNavCategory; selected: boolean; active: boolean; focused: boolean; focusVisible: boolean; hovered: boolean; pressed: boolean; disabled: boolean };

export type CategoryTabProps = EmojiPickerPartElementProps<CategoryTabState, HTMLDivElement, "role">;

export const CategoryTab = React.forwardRef<HTMLDivElement, CategoryTabProps>(function CategoryTab({ children, ...props }, ref) {
  const nav = React.useContext(NavContext);
  const c = React.useContext(TabContext);
  const { disabled = true, choose, selected: current, id } = nav ?? {};
  const interaction = useInteraction({ disabled, onPress: (e) => c && choose?.(c.id, e.pointerType === "keyboard" || e.pointerType === "virtual") });
  if (!nav || !c) throw new Error("EmojiPicker.CategoryNav.Tab must be inside EmojiPicker.CategoryNav.");
  const selected = c.id === current;
  const state: CategoryTabState = { ...interaction.state, category: c, selected, active: selected && !disabled };
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

export const CategoryNav = /* @__PURE__ */ Object.assign(CategoryNavRoot, { Tab: CategoryTab });

export declare namespace CategoryNav {
  type Props = CategoryNavProps;
  type State = CategoryNavState;
  namespace Tab {
    type Props = CategoryTabProps;
    type State = CategoryTabState;
  }
}
