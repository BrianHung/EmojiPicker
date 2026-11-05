import * as React from "react";
import type { PickerState } from "@brianhung/emoji-picker-core";
import { PickerContext } from "./context";

export type CollapsedCategories = {
  collapsed: readonly string[];
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
  setCollapsed: (id: string, collapsed: boolean) => void;
};

const noop = () => {};
const EMPTY: CollapsedCategories = { collapsed: [], isCollapsed: () => false, toggle: noop, setCollapsed: noop };

export function useCollapse(state: PickerState<React.ReactNode>, collapsed: readonly string[]): CollapsedCategories {
  return React.useMemo(() => ({ collapsed, isCollapsed: (id) => collapsed.includes(id), toggle: (id) => state.toggleCollapsed(id), setCollapsed: (id, value) => state.setCollapsed(id, value) }), [state, collapsed]);
}

export function useCollapsedCategories(): CollapsedCategories {
  return React.useContext(PickerContext)?.collapse ?? EMPTY;
}
