// EmojiPicker.CategoryNav: a tablist (manual activation) over the sections. The current
// tab follows the list's scroll; choosing one scrolls the list there (at once from the
// keyboard). One tab stop: the current tab, else the last focused, else the first.
// While search results show, the tabs are disabled.
import * as React from "react";
import { useFocusVisible } from "react-aria/useFocusVisible";
import { DefaultCategoryIcon } from "./category-icons";
import type { CategoryButtonProps } from "./components";
import { usePicker } from "./context";
import { mergeRefs, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import { useCategoryNavigation } from "./picker";
import { SLOTS, joinClasses } from "./slots";

export type CategoryNavProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "children" | "onKeyDown" | "dangerouslySetInnerHTML"> & {
  /** Tab axis: "vertical" stacks the tabs (a side rail) and moves between them with Up/Down. Default "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Runs before the picker handles the key; see Root's `onKeyDown`. */
  onKeyDown?: PickerKeyboardEventHandler<HTMLDivElement>;
  /** Classes for every tab (`data-slot="category-tab"`); the current one has data-active. */
  tabClassName?: string;
};

export const CategoryNav = React.forwardRef<HTMLDivElement, CategoryNavProps>(function CategoryNav({ orientation = "horizontal", tabClassName, onKeyDown, className, ...props }, ref) {
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
  const User = picker.components.CategoryButton;
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

  return (
    <div
      {...props}
      ref={merged}
      id={id}
      role="tablist"
      aria-label={picker.labels.categoryNavigation}
      aria-orientation={orientation}
      className={className ?? ""}
      data-slot={SLOTS.categoryNav}
      data-orientation={orientation}
      style={{ pointerEvents: disabled ? "none" : undefined, ...props.style }}
      onKeyDown={onKey}
      onFocus={(e) => {
        const key = keyOf(e);
        if (key != null) setFocus({ key, within: true });
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocus((f) => ({ ...f, within: false }));
      }}
      onPointerOver={(e) => e.pointerType !== "touch" && setPointer((p) => ({ ...p, hovered: keyOf(e) }))}
      onPointerLeave={() => setPointer({ hovered: null, pressed: null })}
      onPointerDown={(e) => setPointer((p) => ({ ...p, pressed: keyOf(e) }))}
      onPointerUp={() => setPointer((p) => ({ ...p, pressed: null }))}
      onPointerCancel={() => setPointer((p) => ({ ...p, pressed: null }))}
      onClick={(e) => {
        const key = keyOf(e);
        if (key != null && !disabled) choose(key, e.detail === 0);
      }}
    >
      {categories.map((c) => {
        const isSelected = c.id === selected;
        const active = isSelected && !disabled;
        const icon = c.icon ?? <DefaultCategoryIcon category={c.id.startsWith("custom:") ? "custom" : c.id} />;
        // The tabs scroll one list rather than switch panels: no aria-controls to a panel that doesn't exist.
        const tabProps = {
          id: `${id}-tab-${c.id}`,
          role: "tab",
          "aria-label": c.name,
          "aria-selected": isSelected,
          "aria-disabled": disabled || undefined,
          tabIndex: disabled ? undefined : c.id === stop ? 0 : -1,
          className: joinClasses(tabClassName) ?? "",
          "data-slot": SLOTS.categoryTab,
          "data-key": c.id,
          "data-selected": isSelected || undefined,
          "data-disabled": disabled || undefined,
          "data-focused": (focus.within && focus.key === c.id) || undefined,
          "data-focus-visible": (focus.within && focus.key === c.id && isFocusVisible) || undefined,
          "data-hovered": (!disabled && pointer.hovered === c.id) || undefined,
          "data-pressed": (!disabled && pointer.pressed === c.id) || undefined,
          "data-active": active ? "" : undefined,
          children: icon,
        };
        return User ? <User key={c.id} {...tabProps} category={{ id: c.id, name: c.name, isActive: active } satisfies CategoryButtonProps["category"]} /> : <div key={c.id} {...tabProps} />;
      })}
    </div>
  );
});
