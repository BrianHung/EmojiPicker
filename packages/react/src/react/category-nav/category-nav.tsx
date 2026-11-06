// A toolbar of jump links, not tabs: the sections are virtualized, so there are no tab panels to control, and "Frequently used" may have no tab
import * as React from "react";
import { useLocale } from "react-aria/I18nProvider";
import { mergeRefs } from "react-aria/mergeRefs";
import { useFocusRing } from "react-aria/useFocusRing";
import { useHover } from "react-aria/useHover";
import { usePress } from "react-aria/usePress";
import { DefaultCategoryIcon } from "./category-icons";
import { usePicker } from "../root/context";
import { mergePartProps } from "../utils/events";
import { hasModifier, rovingStep, usePickerKeyDown } from "../utils/keyboard";
import { useCategoryNavigation, type NavCategory } from "../root/picker";
import { flag, renderElement, resolve, type Orientation, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { useStore } from "../utils/store";

export type { NavCategory };

export type CategoryNavState = { orientation: Orientation; disabled: boolean };

export type CategoryNavProps = Omit<PartElementProps<CategoryNavState, HTMLDivElement, "role" | "dangerouslySetInnerHTML">, "children"> & {
  orientation?: Orientation;
  children?: (category: NavCategory) => React.ReactNode;
};

type Nav = {
  id: string;
  selected: string;
  stop: string;
  disabled: boolean;
  tabs: Map<string, HTMLElement>;
  choose(key: string, instant: boolean): void;
};
const NavContext = React.createContext<Nav | null>(null);
const TabContext = React.createContext<NavCategory | null>(null);

const CategoryNavRoot = React.forwardRef<HTMLDivElement, CategoryNavProps>(function CategoryNav({ orientation = "horizontal", onKeyDown, className, style, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.CategoryNav");
  const searching = useStore(picker.state, (s) => s.searching);
  const { categories, activeCategory, jumpToCategory } = useCategoryNavigation();
  const id = React.useId();
  const [focus, setFocus] = React.useState<{ key: string | null; within: boolean }>({ key: null, within: false });
  const { direction } = useLocale();
  const [tabs] = React.useState(() => new Map<string, HTMLElement>());
  const keys = usePickerKeyDown(onKeyDown, (e) => {
    const key = [...tabs].find(([, el]) => el.contains(e.target as Node))?.[0];
    if (key == null || searching || hasModifier(e)) return false;
    const ids = categories.map((c) => c.id);
    const step = rovingStep(e.key, direction === "rtl", orientation === "vertical");
    const to = step === "first" ? ids[0] : step === "last" ? ids[ids.length - 1] : step && ids[(ids.indexOf(key) + step + ids.length) % ids.length];
    if (to == null) return false;
    tabs.get(to)?.focus();
    return true;
  });
  if (categories.length <= 1) return null;

  const ids = categories.map((c) => c.id);
  const selected = activeCategory ?? ids[0]!;
  const disabled = searching;
  const focused = focus.key != null && ids.includes(focus.key) ? focus.key : null;
  const stop = (focus.within && focused) || (ids.includes(selected) ? selected : (focused ?? ids[0]!));

  const keyOf = (e: React.SyntheticEvent) => [...tabs].find(([, el]) => el.contains(e.target as Node))?.[0] ?? null;

  const nav: Nav = { id, selected, stop, disabled, tabs, choose: (key, instant) => jumpToCategory(key, { instant }) };
  return (
    <NavContext.Provider value={nav}>
      {renderElement(
        "div",
        {
          ...props,
          ref,
          id,
          role: "toolbar",
          "aria-label": picker.labels.categoryNavigation,
          "aria-orientation": orientation,
          className: className ?? "",
          "data-slot": SLOTS.categoryNav,
          "data-orientation": orientation,
          "data-disabled": flag(disabled),
          style: (s: CategoryNavState) => ({ pointerEvents: s.disabled ? "none" : undefined, ...resolve(style, s) }),
          onKeyDown: keys,
          onFocus: (e: React.FocusEvent) => {
            const key = keyOf(e);
            if (key != null) setFocus({ key, within: true });
          },
          onBlur: (e: React.FocusEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus((f) => ({ ...f, within: false }));
          },
          children: categories.map((c) => (
            <TabContext.Provider key={c.id} value={c}>
              {children ? children(c) : <CategoryTab />}
            </TabContext.Provider>
          )),
        },
        { orientation, disabled },
      )}
    </NavContext.Provider>
  );
});

export type CategoryTabState = { category: NavCategory; selected: boolean; active: boolean; focused: boolean; focusVisible: boolean; hovered: boolean; pressed: boolean; disabled: boolean };

export type CategoryTabProps = PartElementProps<CategoryTabState, HTMLDivElement, "role">;

const CategoryTab = React.forwardRef<HTMLDivElement, CategoryTabProps>(function CategoryTab({ children, ...props }, ref) {
  const nav = React.useContext(NavContext);
  const c = React.useContext(TabContext);
  if (!nav || !c) throw new Error("EmojiPicker.CategoryNav.Tab must be inside EmojiPicker.CategoryNav.");
  const { disabled, tabs } = nav;
  const register = React.useCallback(
    (el: HTMLElement | null) => {
      if (el) tabs.set(c.id, el);
      else tabs.delete(c.id);
    },
    [tabs, c.id],
  );
  const refs = React.useMemo(() => mergeRefs<HTMLDivElement>(register, ref), [register, ref]);
  const { hoverProps, isHovered } = useHover({ isDisabled: disabled });
  const { pressProps, isPressed } = usePress({ isDisabled: disabled, onPress: (e) => nav.choose(c.id, e.pointerType === "keyboard" || e.pointerType === "virtual") });
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();
  const selected = c.id === nav.selected;
  const state: CategoryTabState = {
    category: c,
    selected,
    active: selected && !disabled,
    focused: isFocused,
    focusVisible: isFocusVisible,
    hovered: isHovered,
    pressed: isPressed,
    disabled,
  };
  const icon = c.icon ?? <DefaultCategoryIcon category={c.id} />;
  return renderElement(
    "div",
    {
      "data-slot": SLOTS.categoryTab,
      id: `${nav.id}-tab-${c.id}`,
      role: "button",
      "aria-label": c.name,
      "aria-current": selected || undefined,
      "aria-disabled": disabled || undefined,
      tabIndex: disabled ? undefined : c.id === nav.stop ? 0 : -1,
      className: "",
      ...mergePartProps(props, hoverProps, pressProps, focusProps),
      ref: refs,
      "data-key": c.id,
      "data-disabled": flag(disabled),
      "data-focused": flag(state.focused),
      "data-focus-visible": flag(state.focusVisible),
      "data-hovered": flag(state.hovered),
      "data-pressed": flag(state.pressed),
      "data-active": flag(state.active),
      children: children ?? icon,
    },
    state,
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
