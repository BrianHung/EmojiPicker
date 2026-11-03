// Internal: collapsible category sections. Root owns the state; headers, tabs and
// the hook read it from context. The engine has no collapse support, so a collapsed
// section is passed to it with no emoji (see `collapseEngineInput`), which keeps its
// header and drops its rows from layout, virtualization and keyboard navigation.
import * as React from "react";
import type { EmojiData as EprEmojiData } from "emoji-picker-react/primitives";

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
/** Engine data key for emoji of collapsed groups; no category config names it. */
export const PARKED = "collapsed";

/**
 * What the engine gets for the current collapse state: the dataset with collapsed
 * groups emptied (other groups keep their array identity), whether the suggested
 * section is empty, and the custom emoji ids to hide.
 */
export function collapseEngineInput(
  data: EprEmojiData,
  collapsed: ReadonlySet<string>,
  customs: readonly { id: string; group?: string }[],
): { data: EprEmojiData; hideSuggested: boolean; hiddenCustoms: string[] } {
  let emojis = data.emojis;
  for (const group of Object.keys(data.emojis)) {
    if (!collapsed.has(group)) continue;
    if (emojis === data.emojis) emojis = { ...data.emojis, [PARKED]: [] };
    // Parked under a key no section renders: the engine still resolves them by
    // code (frequents in the suggested section, clicks), but lays none out.
    emojis[PARKED] = emojis[PARKED]!.concat(data.emojis[group]!);
    emojis[group] = NONE;
  }
  const hiddenCustoms = customs.filter((c) => collapsed.has(c.group ? `custom:${c.group}` : "custom")).map((c) => c.id);
  return { data: emojis === data.emojis ? data : { ...data, emojis }, hideSuggested: collapsed.has("suggested"), hiddenCustoms };
}

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
