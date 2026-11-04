// Internal: collapsible category sections. The picker's core state owns them; headers, tabs and
// the hook read them from context. A collapsed section keeps its title and no emoji, which
// drops its rows from layout, virtualization and keyboard navigation.
import * as React from "react";
import type { PickerState } from "../core/picker";

export type CollapsedCategories = {
  /** Ids of the collapsed sections, in the order they were collapsed. */
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

/** Collapse state of the enclosing picker's sections. */
export function useCollapsedCategories(): CollapsedCategories {
  return React.useContext(CollapseContext);
}
