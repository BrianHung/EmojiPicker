import * as React from "react";
import type { PickerState } from "../../core/picker";

export type CollapsedCategories = {
  collapsed: readonly string[];
  isCollapsed: (id: string) => boolean;
  toggle: (id: string) => void;
  setCollapsed: (id: string, collapsed: boolean) => void;
};

const noop = () => {};
const EMPTY: CollapsedCategories = { collapsed: [], isCollapsed: () => false, toggle: noop, setCollapsed: noop };

export const CollapseContext = React.createContext<CollapsedCategories>(EMPTY);

export function useCollapse(state: PickerState<React.ReactNode>, collapsed: readonly string[]): CollapsedCategories {
  return React.useMemo(() => ({ collapsed, isCollapsed: (id) => collapsed.includes(id), toggle: state.toggleCollapsed, setCollapsed: state.setCollapsed }), [state, collapsed]);
}

export function useCollapsedCategories(): CollapsedCategories {
  return React.useContext(CollapseContext);
}
