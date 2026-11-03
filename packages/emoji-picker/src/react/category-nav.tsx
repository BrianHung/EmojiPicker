// EmojiPicker.CategoryNav: React Aria Tabs (manual activation) over the sections.
// The current tab follows the list's scroll; choosing one scrolls the list there
// (at once from the keyboard). While search results show, the tabs are disabled.
import * as React from "react";
import { Tab, TabList, Tabs } from "react-aria-components";
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
  const fromPointer = React.useRef(false);
  const list = React.useRef<HTMLDivElement | null>(null);
  const merged = React.useMemo(() => mergeRefs(ref, userKeys, list), [ref, userKeys]);
  // A tab clicked with a pointer scrolls; chosen any other way (keys, a script) it jumps at once.
  React.useEffect(() => {
    const el = list.current;
    if (!el) return;
    const key = () => void (fromPointer.current = false);
    const pointer = () => void (fromPointer.current = true);
    el.addEventListener("keydown", key, true);
    el.addEventListener("pointerdown", pointer, true);
    return () => {
      el.removeEventListener("keydown", key, true);
      el.removeEventListener("pointerdown", pointer, true);
    };
  });
  const User = picker.components.CategoryButton;
  if (categories.length <= 1) return null;
  const selected = activeCategory ?? categories[0]!.id;
  const choose = (key: React.Key) => {
    const id = String(key);
    const instant = !fromPointer.current;
    fromPointer.current = false;
    if (picker.collapse.isCollapsed(id)) {
      // Expand first, then jump once the rows are laid out.
      picker.collapse.setCollapsed(id, false);
      requestAnimationFrame(() => requestAnimationFrame(() => jumpToCategory(id, { instant })));
    } else jumpToCategory(id, { instant });
  };
  return (
    <Tabs selectedKey={selected} onSelectionChange={choose} keyboardActivation="manual" orientation={orientation} isDisabled={picker.searching} style={{ display: "contents" }}>
      <TabList
        {...props}
        ref={merged}
        aria-label={picker.labels.categoryNavigation}
        className={className ?? ""}
        data-slot={SLOTS.categoryNav}
        style={{ pointerEvents: picker.searching ? "none" : undefined, ...props.style }}
      >
        {categories.map((c) => {
          const active = c.id === selected && !picker.searching;
          const icon = c.icon ?? <DefaultCategoryIcon category={c.id.startsWith("custom:") ? "custom" : c.id} />;
          return (
            <Tab
              key={c.id}
              id={c.id}
              aria-label={c.name}
              className={joinClasses(tabClassName) ?? ""}
              data-slot={SLOTS.categoryTab}
              data-active={active ? "" : undefined}
              // The tabs scroll one list rather than switch panels: no aria-controls to a panel that doesn't exist.
              render={(tabProps) => {
                const props = { ...(tabProps as React.HTMLAttributes<HTMLElement>), "aria-controls": undefined };
                return User ? <User {...props} category={{ id: c.id, name: c.name, isActive: active } satisfies CategoryButtonProps["category"]} /> : <div {...(props as React.HTMLAttributes<HTMLDivElement>)} />;
              }}
            >
              {icon}
            </Tab>
          );
        })}
      </TabList>
    </Tabs>
  );
});
