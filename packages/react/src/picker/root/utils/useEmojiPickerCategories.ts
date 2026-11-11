"use client";

import * as React from "react";
import { mergePartProps } from "../../../internals/mergePartProps";
import { shallowEqual, useStore } from "../../../utils/useStore";
import { useEmojiPickerRootContext } from "../EmojiPickerRootContext";

export interface EmojiPickerNavCategory {
  id: string;
  name: string;
  icon?: React.ReactNode;
}

type ItemProps = {
  role: "button";
  "aria-label": string | undefined;
  "aria-current": true | undefined;
  "aria-disabled": true | undefined;
  tabIndex: number | undefined;
  "data-key": string;
  onClick: (event: React.MouseEvent) => void;
};

export interface UseEmojiPickerCategoriesReturnValue {
  categories: readonly EmojiPickerNavCategory[];
  activeCategory: string | null;
  jumpToCategory(id: string, options?: { instant?: boolean }): void;
  collapsed: readonly string[];
  isCollapsed(id: string): boolean;
  setCollapsed(id: string, collapsed: boolean): void;
  toggleCollapsed(id: string): void;
  getItemProps<P extends object = object>(id: string, props?: P): P & ItemProps;
}

export function useEmojiPickerCategories(): UseEmojiPickerCategoriesReturnValue {
  const { state, list } = useEmojiPickerRootContext("useEmojiPickerCategories");
  const view = useStore(state, ({ categories, categorySections, searching, activeSection, collapsed }) => ({ categories, categorySections, searching, activeSection, collapsed }), shallowEqual);
  const categories = React.useMemo(() => {
    const shown = new Set(view.categorySections.map((s) => s.id));
    return view.categories.filter((c) => c.nav && shown.has(c.id)).map(({ id, name, icon }) => ({ id, name, icon }));
  }, [view.categories, view.categorySections]);
  const isCollapsed = React.useCallback((id: string) => state.getSnapshot().collapsed.includes(id), [state]);
  const setCollapsed = React.useCallback((id: string, collapsed: boolean) => state.setCollapsed(id, collapsed), [state]);
  const toggleCollapsed = React.useCallback((id: string) => state.toggleCollapsed(id), [state]);
  const jumpToCategory = React.useCallback(
    (id: string, options?: { instant?: boolean }) => {
      const collapsed = isCollapsed(id);
      if (collapsed) state.setCollapsed(id, false);
      list.current?.jump(id, { ...options, afterRender: collapsed });
    },
    [state, list, isCollapsed],
  );
  const activeCategory = view.searching ? null : view.activeSection;
  const current = categories.some((c) => c.id === activeCategory) ? activeCategory : (categories[0]?.id ?? null);
  const disabled = view.searching;
  const getItemProps = <P extends object = object>(id: string, props?: P) => {
    const selected = id === current;
    return {
      role: "button",
      "aria-label": categories.find((c) => c.id === id)?.name,
      "aria-current": selected || undefined,
      "aria-disabled": disabled || undefined,
      // One tab stop, on the section in view; React Aria's Toolbar moves among the rest with the arrows
      tabIndex: disabled ? undefined : selected ? 0 : -1,
      "data-key": id,
      ...mergePartProps<object>(props ?? {}, { onClick: (e: React.MouseEvent) => disabled || jumpToCategory(id, { instant: e.detail === 0 }) }),
    } as P & ItemProps;
  };
  return { categories, activeCategory, jumpToCategory, collapsed: view.collapsed, isCollapsed, setCollapsed, toggleCollapsed, getItemProps };
}
