// EmojiPicker.CategoryNav: a tablist (manual activation) over the sections. The current
// tab follows the list's scroll; choosing one scrolls the list there (at once from the
// keyboard). One tab stop: the current tab, else the last focused, else the first.
// While search results show, the tabs are disabled.
// Not React Aria's Tabs: they always select a tab, and "Frequently used" has none (no tab
// selected, the first still the tab stop); they'd also cost 1.7 KB gzip more.
import * as React from "react";
import { mergeRefs } from "react-aria/mergeRefs";
import { useFocusVisible } from "react-aria/useFocusVisible";
import { DefaultCategoryIcon } from "./category-icons";
import { usePicker } from "../root/context";
import { useUserKeyDown, type PickerKeyboardEventHandler } from "../root/keyboard";
import { useCategoryNavigation } from "../root/picker";
import { renderElement, resolve, type PartElementProps } from "../utils/render";
import { SLOTS } from "../utils/slots";

type Orientation = "horizontal" | "vertical";

/** A tab's section: its id, name and icon. */
export type NavCategory = ReturnType<typeof useCategoryNavigation>["categories"][number];

export type CategoryNavState = { orientation: Orientation; disabled: boolean };

export type CategoryNavProps = Omit<PartElementProps<CategoryNavState, HTMLDivElement, "role" | "onKeyDown" | "dangerouslySetInnerHTML">, "children"> & {
  /** Tab axis: "vertical" stacks the tabs (a side rail) and moves between them with Up/Down. Default "horizontal". */
  orientation?: Orientation;
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
  /** Each section's tab. Default: `CategoryNav.Tab`. */
  children?: (category: NavCategory) => React.ReactNode;
};

type Nav = { id: string; selected: string; stop: string; disabled: boolean; focus: { key: string | null; within: boolean }; pointer: { hovered: string | null; pressed: string | null }; focusVisible: boolean };
const NavContext = React.createContext<Nav | null>(null);
const TabContext = React.createContext<NavCategory | null>(null);

const CategoryNavRoot = React.forwardRef<HTMLDivElement, CategoryNavProps>(function CategoryNav({ orientation = "horizontal", onKeyDown, className, style, children, ...props }, ref) {
  const picker = usePicker("EmojiPicker.CategoryNav");
  const { categories, activeCategory, jumpToCategory } = useCategoryNavigation();
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);
  const list = React.useRef<HTMLDivElement | null>(null);
  const merged = React.useMemo(() => mergeRefs(ref, userKeys, list), [ref, userKeys]);
  const id = React.useId();
  // The focused tab, and whether focus is still in the list (then it stays the tab stop).
  const [focus, setFocus] = React.useState<{ key: string | null; within: boolean }>({ key: null, within: false });
  const [pointer, setPointer] = React.useState<{ hovered: string | null; pressed: string | null }>({ hovered: null, pressed: null });
  const { isFocusVisible } = useFocusVisible();
  if (categories.length <= 1) return null;

  const ids = categories.map((c) => c.id);
  const selected = activeCategory ?? ids[0]!;
  const disabled = picker.searching;
  const focused = focus.key != null && ids.includes(focus.key) ? focus.key : null;
  const stop = (focus.within && focused) || (ids.includes(selected) ? selected : (focused ?? ids[0]!));
  const tab = (key: string) => list.current?.querySelector<HTMLElement>(`[data-key="${CSS.escape(key)}"]`);
  // A tab clicked with a pointer scrolls; chosen any other way (keys, a script) it jumps at once.
  const choose = (key: string, instant: boolean) => {
    if (picker.collapse.isCollapsed(key)) {
      // Expand first, then jump once the rows are laid out.
      picker.collapse.setCollapsed(key, false);
      requestAnimationFrame(() => requestAnimationFrame(() => jumpToCategory(key, { instant })));
    } else jumpToCategory(key, { instant });
  };
  const keyOf = (e: React.SyntheticEvent) => (e.target as Element).closest?.('[role="tab"]')?.getAttribute("data-key") ?? null;
  const onKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = keyOf(e);
    if (key == null || disabled || e.altKey || e.ctrlKey || e.metaKey) return;
    const i = ids.indexOf(key);
    const rtl = orientation === "horizontal" && getComputedStyle(e.currentTarget).direction === "rtl";
    const [back, forward] = orientation === "vertical" ? ["ArrowUp", "ArrowDown"] : rtl ? ["ArrowRight", "ArrowLeft"] : ["ArrowLeft", "ArrowRight"];
    const to = e.key === forward ? ids[(i + 1) % ids.length] : e.key === back ? ids[(i - 1 + ids.length) % ids.length] : e.key === "Home" ? ids[0] : e.key === "End" ? ids[ids.length - 1] : undefined;
    if (to != null) tab(to)?.focus();
    else if (e.key === "Enter" || e.key === " ") choose(key, true);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const nav: Nav = { id, selected, stop, disabled, focus, pointer, focusVisible: isFocusVisible };
  return (
    <NavContext.Provider value={nav}>
      {renderElement(
        "div",
        {
          ...props,
          ref: merged,
          id,
          role: "tablist",
          "aria-label": picker.labels.categoryNavigation,
          "aria-orientation": orientation,
          className: className ?? "",
          "data-slot": SLOTS.categoryNav,
          "data-orientation": orientation,
          style: (s: CategoryNavState) => ({ pointerEvents: s.disabled ? "none" : undefined, ...resolve(style, s) }),
          onKeyDown: onKey,
          onFocus: (e: React.FocusEvent) => {
            const key = keyOf(e);
            if (key != null) setFocus({ key, within: true });
          },
          onBlur: (e: React.FocusEvent) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus((f) => ({ ...f, within: false }));
          },
          onPointerOver: (e: React.PointerEvent) => e.pointerType !== "touch" && setPointer((p) => ({ ...p, hovered: keyOf(e) })),
          onPointerLeave: () => setPointer({ hovered: null, pressed: null }),
          onPointerDown: (e: React.PointerEvent) => setPointer((p) => ({ ...p, pressed: keyOf(e) })),
          onPointerUp: () => setPointer((p) => ({ ...p, pressed: null })),
          onPointerCancel: () => setPointer((p) => ({ ...p, pressed: null })),
          onClick: (e: React.MouseEvent) => {
            const key = keyOf(e);
            if (key != null && !disabled) choose(key, e.detail === 0);
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

export type CategoryTabProps = PartElementProps<CategoryTabState, HTMLDivElement, "role" | "id">;

/** A section's tab. Children default to its icon. */
const CategoryTab = React.forwardRef<HTMLDivElement, CategoryTabProps>(function CategoryTab({ children, ...props }, ref) {
  const nav = React.useContext(NavContext);
  const c = React.useContext(TabContext);
  if (!nav || !c) throw new Error("EmojiPicker.CategoryNav.Tab must be inside EmojiPicker.CategoryNav.");
  const { disabled } = nav;
  const selected = c.id === nav.selected;
  const focused = nav.focus.within && nav.focus.key === c.id;
  const state: CategoryTabState = {
    category: c,
    selected,
    active: selected && !disabled,
    focused,
    focusVisible: focused && nav.focusVisible,
    hovered: !disabled && nav.pointer.hovered === c.id,
    pressed: !disabled && nav.pointer.pressed === c.id,
    disabled,
  };
  const icon = c.icon ?? <DefaultCategoryIcon category={c.id.startsWith("custom:") ? "custom" : c.id} />;
  // The tabs scroll one list rather than switch panels: no aria-controls to a panel that doesn't exist.
  return renderElement(
    "div",
    {
      "data-slot": SLOTS.categoryTab,
      id: `${nav.id}-tab-${c.id}`,
      role: "tab",
      "aria-label": c.name,
      "aria-selected": selected,
      "aria-disabled": disabled || undefined,
      tabIndex: disabled ? undefined : c.id === nav.stop ? 0 : -1,
      className: "",
      ...props,
      ref,
      "data-key": c.id,
      "data-selected": selected || undefined,
      "data-disabled": disabled || undefined,
      "data-focused": state.focused || undefined,
      "data-focus-visible": state.focusVisible || undefined,
      "data-hovered": state.hovered || undefined,
      "data-pressed": state.pressed || undefined,
      "data-active": state.active ? "" : undefined,
      children: children ?? icon,
    },
    state,
  );
});

export const CategoryNav = /* @__PURE__ */ Object.assign(CategoryNavRoot, { Tab: CategoryTab });
