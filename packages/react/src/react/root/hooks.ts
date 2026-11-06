import * as React from "react";
import type { EmojiRecord } from "@brianhung/emoji-picker-core";
import { usePicker } from "./context";
import { shallowEqual, useStore } from "../utils/store";

export function useActiveEmoji(): EmojiRecord | null {
  return useStore(usePicker("useActiveEmoji").state, (s) => s.active?.record ?? null);
}

export interface EmojiPickerNavCategory {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

export interface CategoryNavigation {
  categories: readonly EmojiPickerNavCategory[];
  activeCategory: string | null;
  jumpToCategory(id: string, options?: { instant?: boolean }): void;
}

export function useCategoryNavigation(): CategoryNavigation {
  const picker = usePicker("useCategoryNavigation");
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

export interface SearchSummary {
  query: string;
  resultCount: number | null;
}

export function useSearchState(): SearchSummary {
  const { state } = usePicker("useSearchState");
  return useStore(state, ({ query, searching, pending, results }) => ({ query, resultCount: searching && !pending ? results.length : null }), shallowEqual);
}
