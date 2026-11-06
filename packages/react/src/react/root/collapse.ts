import * as React from "react";
import type { PickerState } from "../state/picker";
import { usePicker } from "./context";

export type CollapsedCategories = {
  collapsed: readonly string[];
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
  setCollapsed: (id: string, collapsed: boolean) => void;
};

export function useCollapse(state: PickerState<React.ReactNode>, collapsed: readonly string[]): CollapsedCategories {
  return React.useMemo(() => ({ collapsed, isCollapsed: (id) => collapsed.includes(id), toggle: (id) => state.toggleCollapsed(id), setCollapsed: (id, value) => state.setCollapsed(id, value) }), [state, collapsed]);
}

export const useCollapsedCategories = (): CollapsedCategories => usePicker("useCollapsedCategories").collapse;
