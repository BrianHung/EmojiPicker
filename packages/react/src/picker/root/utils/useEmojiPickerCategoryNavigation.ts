"use client";

import * as React from "react";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";
import { shallowEqual, useStore } from "../../../utils/useStore";

export interface EmojiPickerNavCategory {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

export interface EmojiPickerCategoryNavigation {
  categories: readonly EmojiPickerNavCategory[];
  activeCategory: string | null;
  jumpToCategory(id: string, options?: { instant?: boolean }): void;
}

export function useEmojiPickerCategoryNavigation(): EmojiPickerCategoryNavigation {
  const picker = useEmojiPickerRootContext("useEmojiPickerCategoryNavigation");
  const view = useStore(picker.state, ({ categories, categorySections, searching, activeSection }) => ({ categories, categorySections, searching, activeSection }), shallowEqual);
  const categories = React.useMemo(() => {
    const shown = new Set(view.categorySections.map((s) => s.id));
    return view.categories.filter((c) => c.nav && shown.has(c.id)).map(({ id, name, icon }) => ({ id, name, icon }));
  }, [view.categories, view.categorySections]);
  const { list, collapse } = picker;
  const jumpToCategory = React.useCallback(
    (id: string, options?: { instant?: boolean }) => {
      const collapsed = collapse.isCollapsed(id);
      if (collapsed) collapse.setCollapsed(id, false);
      list.current?.jump(id, { ...options, afterRender: collapsed });
    },
    [list, collapse],
  );
  return { categories, activeCategory: view.searching ? null : view.activeSection, jumpToCategory };
}
