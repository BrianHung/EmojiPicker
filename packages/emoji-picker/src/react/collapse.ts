// Internal: collapsible category sections. Root owns the state; headers, tabs and
// the hook read it from context. A collapsed section keeps its title and no emoji,
// which drops its rows from layout, virtualization and keyboard navigation.
import * as React from "react";

/** `ids` with `id` added (collapsed) or removed (expanded). Returns `ids` itself when nothing changes. */
export function setCategoryCollapsed(ids: readonly string[], id: string, collapsed: boolean): readonly string[] {
  const has = ids.includes(id);
  if (has === collapsed) return ids;
  return collapsed ? [...ids, id] : ids.filter((x) => x !== id);
}

export function toggleCategoryCollapsed(ids: readonly string[], id: string): readonly string[] {
  return setCategoryCollapsed(ids, id, !ids.includes(id));
}

const NONE: never[] = [];

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
/** Search results ignore collapse: their headers read this instead. */
export const NoCollapse = EMPTY;

/** Controlled (`value`) or uncontrolled (`defaultValue`) collapse state. */
export function useCollapseState(value: readonly string[] | undefined, defaultValue: readonly string[] | undefined, onChange: ((ids: string[]) => void) | undefined): CollapsedCategories {
  const [inner, setInner] = React.useState<readonly string[]>(defaultValue ?? NONE);
  const current = value ?? inner;
  const latest = React.useRef({ current, value, onChange });
  latest.current = { current, value, onChange };
  const update = React.useCallback((next: (ids: readonly string[]) => readonly string[]) => {
    const { current, value, onChange } = latest.current;
    const ids = next(current);
    if (ids === current) return;
    // Later calls in the same tick see this result.
    latest.current = { ...latest.current, current: ids };
    if (value === undefined) setInner(ids);
    onChange?.([...ids]);
  }, []);
  return React.useMemo(
    () => ({
      collapsed: current,
      isCollapsed: (id) => current.includes(id),
      toggle: (id) => update((ids) => toggleCategoryCollapsed(ids, id)),
      setCollapsed: (id, collapsed) => update((ids) => setCategoryCollapsed(ids, id, collapsed)),
    }),
    [current, update],
  );
}

/** Collapse state of the enclosing picker's sections. */
export function useCollapsedCategories(): CollapsedCategories {
  return React.useContext(CollapseContext);
}
