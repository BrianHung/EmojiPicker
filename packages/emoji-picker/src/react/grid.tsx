// The emoji grid's behaviour, apart from how it is laid out and virtualized: a listbox (React
// Aria's useListBox over the picker's sections, see collection.ts), the highlight and focus, keys,
// hover and presses, and skin-tone variations. EmojiPicker.List renders it with React Aria's
// virtualizer; useEmojiGrid hands it, with the rows of core/grid, to a virtualizer you bring.
import * as React from "react";
import type { Key, LayoutDelegate } from "@react-types/shared";
import { useFocusRing } from "react-aria/useFocusRing";
import { useFocusVisible } from "react-aria/useFocusVisible";
import { useListBox } from "react-aria/useListBox";
import { mergeProps } from "react-aria/mergeProps";
import { useListState, type ListState } from "react-stately/useListState";
import { AutocompleteStateContext, SelectableCollectionContext } from "react-aria-components/Autocomplete";
import { createEmojiGrid, type EmojiGrid, type EmojiGridMove, type EmojiGridRow } from "../core/grid";
import { GROUPS } from "../core/dataset";
import { EmojiCollection } from "./collection";
import type { ListComponents } from "./components";
import { signal, usePicker, type ListHandle } from "./context";
import { Glyph } from "./glyph";
import { mergeRefs, useKeyRegion, useUserKeyDown, type PickerKeyboardEventHandler } from "./keyboard";
import type { ListProps } from "./list";
import type { KeyboardAction } from "./keymap";
import { EmojiGridNavigation } from "./navigation";
import { useDrawable } from "./native-support";
import { findArtwork, useArtworkMap, type ArtworkMap } from "./overrides";
import { itemFactory, resultSections, type EmojiItem, type EmojiSection } from "./sections";
import { SLOTS } from "./slots";
import { Variations } from "./variations";
import { moveVirtualFocus } from "./virtual-focus";

/**
 * Hover moves the keyboard position only on a real pointer move: a keyboard scroll
 * slides cells under a resting pointer, and the browser reports hovers (and moves at
 * the same spot) for them.
 */
const pointer = { x: NaN, y: NaN, moved: false, tracking: false };
function trackPointer() {
  if (pointer.tracking) return;
  pointer.tracking = true;
  addEventListener(
    "pointermove",
    (e) => {
      pointer.moved = e.clientX !== pointer.x || e.clientY !== pointer.y;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    },
    { capture: true, passive: true },
  );
}

/** Per-cell state the grid sets and each cell reads as one number (one subscription per cell). */
export const STOP = 1;
export const ACTIVE = 2;
export const HOVERED = 4;
export const PRESSED = 8;
function cellMarks() {
  const marks = { stop: signal<Key | null>(null), active: signal<Key | null>(null), hovered: signal<Key | null>(null), pressed: signal<Key | null>(null) };
  const all = Object.values(marks);
  return {
    ...marks,
    subscribe(listener: () => void) {
      const off = all.map((s) => s.subscribe(listener));
      return () => off.forEach((f) => f());
    },
    of: (key: Key) => (marks.stop.get() === key ? STOP : 0) | (marks.active.get() === key ? ACTIVE : 0) | (marks.hovered.get() === key ? HOVERED : 0) | (marks.pressed.get() === key ? PRESSED : 0),
  };
}

export type Cells = {
  state: ListState<unknown>;
  /** The listbox's id (options are `${id}-option-${key}`) and collection id. */
  listId: string;
  collectionId?: string;
  focusVisible: boolean;
  /** Position in its section, the section's size, and the index in the whole grid. */
  position: (id: Key) => readonly [number, number, number] | undefined;
  components: ListComponents;
  cellClassName?: string;
  headerClassName?: string;
  virtual: boolean;
  marks: ReturnType<typeof cellMarks>;
  /** Scrolls the scroller (never the page) so the cell is in view. */
  reveal(id: Key): void;
  sectionDomId(id: string): string;
  toggle(id: string): void;
};

/** How a grid is laid out and scrolled: the default list's virtualizer, or one you bring. */
export type GridGeometry = {
  grid(): EmojiGrid<EmojiSection>;
  navigation: EmojiGridNavigation;
  layoutDelegate?: LayoutDelegate;
  firstVisible(): Key | null;
  isVisible(key: Key): boolean;
  /** Scrolls only the scroller (never the page) so `key` is in view; a page `from` a key keeps it where it is on screen. */
  reveal(key: Key, from?: Key): void;
  /** The scroller's length along the grid: a page. */
  viewport(): number;
  /** Scrolls a section to the start; false when it can't. */
  jump(section: string, instant: boolean): boolean;
  /** Where the skin-tone variations of `key` go. */
  overlay(key: Key): React.CSSProperties;
};

const MOVES: Partial<Record<KeyboardAction, EmojiGridMove>> = { "move-up": "up", "move-down": "down", "move-left": "left", "move-right": "right", "page-up": "page-up", "page-down": "page-down", first: "first", last: "last" };
const LONG_PRESS_MS = 500;
const NO_COMPONENTS: ListComponents = {};
const baseOf = (unified: string) => unified.toLowerCase().replace(/-1f3f[b-f]/g, "");
export const isRtl = (el: Element | null | undefined) => (el ? getComputedStyle(el).direction === "rtl" : false);
const cellOf = (target: EventTarget | null) => (target instanceof Element ? target.closest(`[data-slot="${SLOTS.emoji}"]`) : null);

/** The sections the grid shows: the categories (without emoji the system can't draw), or the search results. */
export function useGridSections(horizontal: boolean) {
  const picker = usePicker("EmojiPicker.List");
  const { store, labels, searching } = picker;
  const item = React.useMemo(() => itemFactory(labels), [labels]);
  const groupNames = store.status() === "ready" ? store.groupNames() : [];
  const categoryName = React.useCallback(
    (group: string) => picker.categories.find((c) => c.id === group)?.name ?? (group === "custom" ? labels.custom : (groupNames[GROUPS.indexOf(group as (typeof GROUPS)[number])] ?? group)),
    [picker.categories, labels, groupNames],
  );
  const probeRoot = React.useRef<HTMLElement | null>(null);
  const { drawable, request } = useDrawable(probeRoot);
  const categories = React.useMemo(
    () =>
      horizontal
        ? picker.categorySections
        : picker.categorySections.flatMap((s) => {
            const seen = new Set<string>();
            const items = s.items.filter((i) => drawable(i.record, i.unified) && !seen.has(i.unified) && seen.add(i.unified));
            if (items.length === s.items.length) return [s];
            return items.length || s.collapsed ? [{ ...s, items }] : [];
          }),
    [horizontal, picker.categorySections, drawable],
  );
  const results = React.useMemo(
    () => (searching ? resultSections(picker.results, picker.searchResults, categoryName, (u) => store.withSkinTone(u), item, labels.searchResults) : null),
    [searching, picker.results, picker.searchResults, categoryName, store, item, labels.searchResults],
  );
  return { sections: results ?? categories, request, probeRoot };
}

type ControllerOptions = Pick<ListProps, "value" | "onKeyDown" | "aria-label" | "aria-labelledby" | "components" | "cellClassName" | "headerClassName"> & {
  sections: readonly EmojiSection[];
  geometry: GridGeometry;
  orientation: "vertical" | "horizontal";
  listRef: React.RefObject<HTMLElement | null>;
  ref?: React.Ref<HTMLElement>;
  probeRoot?: React.Ref<HTMLElement>;
  loader?: boolean;
};

/** The grid's state, its listbox props and its cells' context. */
export function useGridController({ sections, geometry, orientation, listRef, ref, probeRoot, loader = false, value, onKeyDown, components = NO_COMPONENTS, cellClassName, headerClassName, ...aria }: ControllerOptions) {
  const picker = usePicker("EmojiPicker.List");
  const { labels, searching, focusModel } = picker;
  const { navigation } = geometry;
  const collection = React.useMemo(() => new EmojiCollection(sections, loader), [sections, loader]);
  const selected = React.useMemo(() => (value == null ? undefined : sections.flatMap((s) => s.items.filter((i) => baseOf(i.unified) === baseOf(value)).map((i) => i.id))), [value, sections]);
  const state = useListState<unknown>({ collection, selectionMode: value === undefined ? "none" : "single", selectedKeys: selected ?? [], disallowEmptySelection: value !== undefined, layoutDelegate: geometry.layoutDelegate });
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const autocomplete = React.useContext(AutocompleteStateContext);
  // DOM focus in a cell (Tab from the field): the grid leaves virtual focus while it's there.
  const [domFocus, setDomFocus] = React.useState(false);
  const virtual = focusModel === "input" && picker.hasSearch && !domFocus;
  const [marks] = React.useState(cellMarks);
  const pendingFocus = React.useRef<Key | null>(null);
  const lastFocused = React.useRef<Key | null>(null);
  const latest = React.useRef({ collection, virtual, geometry });
  latest.current = { collection, virtual, geometry };

  const setActive = React.useCallback(
    (key: Key | null) => {
      marks.active.set(key);
      picker.activeEmoji.set(latest.current.collection.emoji(key)?.record ?? null);
    },
    [marks, picker.activeEmoji],
  );

  const moveTo = (key: Key, dom: boolean, from?: Key) => {
    const manager = stateRef.current.selectionManager;
    geometry.reveal(key, from);
    if (dom) pendingFocus.current = key;
    manager.setFocused(true);
    manager.setFocusedKey(key);
    if (dom) marks.stop.set(key);
    setActive(marks.hovered.get() ?? key);
  };

  const pick = (key: Key) => {
    const it = latest.current.collection.emoji(key);
    if (it) picker.pick(it.unified);
  };

  const highlight = (): Key | null => {
    const m = stateRef.current.selectionManager;
    return m.isFocused && latest.current.collection.emoji(m.focusedKey) ? m.focusedKey : null;
  };

  const focusInput = () => listRef.current?.closest(`[data-slot="${SLOTS.root}"]`)?.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`) ?? null;
  /** The rendered cell for a key (in this grid, not a nested one). */
  const cellElement = (key: Key | null | undefined) => (key == null ? null : (listRef.current?.querySelector<HTMLElement>(`[data-slot="${SLOTS.emoji}"][data-key="${CSS.escape(String(key))}"]`) ?? null));

  // --- Skin-tone variations of one emoji ---------------------------------------------
  const [variations, setVariations] = React.useState<{ key: Key; back: HTMLElement | null } | null>(null);
  const openVariations = (key: Key | null) => {
    const record = latest.current.collection.emoji(key)?.record;
    if (key == null || !record?.tones.length || record.imageUrl || picker.disableVariations) return false;
    setVariations({ key, back: document.activeElement instanceof HTMLElement ? document.activeElement : null });
    return true;
  };
  const closeVariations = (restore: boolean) => {
    if (!variations) return;
    setVariations(null);
    if (!restore) return;
    // Back to the emoji: its cell (grid), or the field with the emoji highlighted.
    const m = stateRef.current.selectionManager;
    (variations.back ?? cellElement(variations.key))?.focus({ preventScroll: true });
    m.setFocused(true);
    m.setFocusedKey(variations.key);
  };

  const handle: ListHandle = {
    key(action, from, event) {
      const dom = from === "list";
      if (action === "select") {
        const key = highlight();
        if (key == null) return false;
        pick(key);
        return true;
      }
      let move = action;
      if (isRtl(listRef.current) && (move === "move-left" || move === "move-right")) move = move === "move-left" ? "move-right" : "move-left";
      // With focus in the grid, the move starts from the focused cell.
      const current = (dom ? cellOf(event?.target ?? null)?.getAttribute("data-key") : null) ?? highlight();
      if (current == null) {
        // Nothing highlighted: Down (and the keys that go forward) start at the first emoji in view.
        const start = move === "first" ? navigation.getFirstKey() : move === "last" ? navigation.getLastKey() : move === "move-down" || move === "move-right" || move === "page-down" ? geometry.firstVisible() : null;
        if (start == null) return false;
        moveTo(start, dom);
        return true;
      }
      const to = MOVES[move];
      if (!to) return false;
      const next = navigation.move(current, to, geometry.viewport());
      if (next == null || next === current) {
        // Up from the top row: back to typing (the field keeps focus), or back to the field.
        if (move === "move-up") {
          if (dom) focusInput()?.focus();
          else handle.clear();
        }
        return true;
      }
      moveTo(next, dom, move === "page-down" || move === "page-up" ? current : undefined);
      return true;
    },
    clear() {
      const m = stateRef.current.selectionManager;
      if (!latest.current.virtual || !m.isFocused || m.focusedKey == null) return false;
      m.setFocused(false);
      autocomplete?.setFocusedNodeId(null);
      setActive(marks.hovered.get());
      return true;
    },
    focus() {
      const m = stateRef.current.selectionManager;
      const key = latest.current.collection.emoji(m.focusedKey) ? m.focusedKey : geometry.firstVisible();
      if (key == null) return false;
      setDomFocus(true);
      moveTo(key, true);
      return true;
    },
    jump(id, { instant = false } = {}) {
      if (!geometry.jump(id, instant)) return;
      picker.activeSection.set(id);
      const first = sections.find((s) => s.id === id)?.items[0]?.id;
      if (first != null) marks.stop.set(first);
    },
    atStart() {
      const key = highlight();
      return key != null && key === navigation.getFirstKey();
    },
    variations(target) {
      const cell = cellOf(target);
      const key = cell && listRef.current?.contains(cell) ? cell.getAttribute("data-key") : target === focusInput() ? highlight() : null;
      return openVariations(key);
    },
  };
  React.useLayoutEffect(() => {
    picker.list.current = handle;
    return () => {
      if (picker.list.current === handle) picker.list.current = null;
    };
  });

  // Search results: the best match is highlighted as you type (Enter picks it). New
  // results for the same query keep the highlighted emoji, so a pick doesn't move it.
  // React Aria builds the new collection in a later render, so the highlight is applied
  // once a render has it (applyHighlight).
  const kept = React.useRef<{ query: string; unified?: string }>({ query: "" });
  const pendingHighlight = React.useRef<{ key: Key | null } | null>(null);
  React.useLayoutEffect(() => {
    if (!searching) {
      if (kept.current.query) {
        kept.current = { query: "" };
        pendingHighlight.current = { key: null };
      }
      return;
    }
    const all = sections.flatMap((s) => s.items);
    const focused = stateRef.current.selectionManager.focusedKey;
    const unified = all.find((i) => i.id === focused)?.unified ?? kept.current.unified;
    const previous = kept.current.query === picker.query ? all.find((i) => i.unified === unified) : undefined;
    const target = previous ?? all[0];
    kept.current = { query: picker.query, unified: target?.unified };
    pendingHighlight.current = { key: target?.id ?? null };
  }, [sections]);
  const applyHighlight = () => {
    const pending = pendingHighlight.current;
    const state = stateRef.current;
    if (!pending || (pending.key != null && !state.collection.getItem(pending.key))) return;
    pendingHighlight.current = null;
    const m = state.selectionManager;
    if (pending.key == null) {
      m.setFocusedKey(null);
      m.setFocused(false);
      return;
    }
    if (latest.current.virtual && document.activeElement === focusInput()) m.setFocused(true);
    m.setFocusedKey(pending.key);
    setActive(marks.hovered.get() ?? pending.key);
  };
  // Track the highlighted emoji for useActiveEmoji while the field keeps focus.
  const focusedKey = state.selectionManager.focusedKey;
  React.useEffect(() => {
    if (focusedKey != null && searching) kept.current.unified = latest.current.collection.emoji(focusedKey)?.unified;
  }, [focusedKey, searching]);

  /**
   * The tab stop: the focused cell while focus is in the grid; else the last one while it's
   * in view, else the first in view (Tab enters where the user looks).
   */
  const syncStop = () => {
    const list = listRef.current;
    if (list?.contains(document.activeElement) && document.activeElement !== list) return;
    const { collection, geometry } = latest.current;
    const stop = marks.stop.get();
    if (stop == null || !geometry.isVisible(stop) || !collection.emoji(stop)) marks.stop.set(collection.emoji(lastFocused.current) && geometry.isVisible(lastFocused.current!) ? lastFocused.current : geometry.firstVisible());
  };

  // DOM focus landing on a cell (Tab from the search field, a script, a screen reader) while the
  // grid is in virtual-focus mode: the cell becomes the focused key before React Aria's collection
  // sees the focus, or it would treat focus as entering with no key and move it to the first cell.
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onFocusIn = (e: FocusEvent) => {
      const manager = stateRef.current.selectionManager;
      const id = cellOf(e.target)?.getAttribute("data-key");
      if (id == null || e.target !== document.activeElement || manager.focusedKey === id) return;
      manager.setFocusedKey(id);
    };
    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
  }, []);

  // --- Keys on a focused cell, from Root's dispatcher -------------------------------
  const region = useKeyRegion((action, event) => {
    const cell = cellOf(event.target);
    if (!action || !cell || !listRef.current?.contains(cell)) return "pass";
    if (action === "select") {
      const id = cell.getAttribute("data-key");
      if (id != null) pick(id);
      return "handled";
    }
    return handle.key(action, "list", event) ? "handled" : "pass";
  });
  const userKeys = useUserKeyDown(onKeyDown as PickerKeyboardEventHandler | undefined);

  const hover = (key: Key | null) => {
    marks.hovered.set(key);
    setActive(key ?? highlight());
  };
  /** A real pointer move over a cell: the keyboard position follows (pointer "follows"). */
  const follow = (key: Key) => {
    const m = state.selectionManager;
    if (!pointer.moved || picker.pointer !== "follows" || m.focusedKey === key) return;
    const active = document.activeElement;
    const list = listRef.current;
    const root = list?.closest(`[data-slot="${SLOTS.root}"]`);
    // Hover moves the keyboard position: the highlight while the field has focus, focus
    // itself once it's in the grid. Never from outside the picker.
    if (list?.contains(active) && active !== list) {
      pendingFocus.current = key;
      m.setFocused(true);
      m.setFocusedKey(key);
      marks.stop.set(key);
    } else if (virtual && active instanceof HTMLInputElement && root?.contains(active)) {
      m.setFocused(true);
      m.setFocusedKey(key);
    }
  };
  // Cells have no handlers of their own: the grid handles presses, hover and focus for all of them.
  const keyOf = (e: React.SyntheticEvent) => cellOf(e.target)?.getAttribute("data-key") ?? null;
  // A long press on an emoji with tones opens its variations; the release then doesn't pick.
  const longPress = React.useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const endPress = () => {
    marks.pressed.set(null);
    if (longPress.current) clearTimeout(longPress.current.timer);
  };
  const cellHandlers: React.HTMLAttributes<HTMLElement> = {
    onPointerDown(e) {
      const key = keyOf(e);
      if (key == null || e.button !== 0) return;
      endPress();
      marks.pressed.set(key);
      longPress.current = { x: e.clientX, y: e.clientY, fired: false, timer: window.setTimeout(() => longPress.current && (longPress.current.fired = openVariations(key)), LONG_PRESS_MS) };
      // Focus stays in the field (virtual focus) or moves to the cell without scrolling.
      e.preventDefault();
      if (e.pointerType === "touch") return;
      const m = state.selectionManager;
      if (virtual) {
        m.setFocused(true);
        m.setFocusedKey(key);
      } else cellElement(key)?.focus({ preventScroll: true });
    },
    onMouseDown(e) {
      if (keyOf(e) != null) e.preventDefault();
    },
    onPointerUp: endPress,
    onPointerCancel: endPress,
    onContextMenu(e) {
      if (longPress.current?.fired) e.preventDefault();
    },
    onClick(e) {
      const key = keyOf(e);
      const held = longPress.current?.fired;
      longPress.current = null;
      if (key == null || held) return;
      if (virtual && (e.nativeEvent as PointerEvent).pointerType === "touch") {
        state.selectionManager.setFocused(true);
        state.selectionManager.setFocusedKey(key);
      }
      pick(key);
    },
    onPointerOver(e) {
      const key = keyOf(e);
      if (e.pointerType !== "touch" && key !== marks.hovered.get()) hover(key);
    },
    onPointerOut(e) {
      const cell = cellOf(e.target);
      if (cell && !cell.contains(e.relatedTarget as Node | null) && marks.hovered.get() === cell.getAttribute("data-key")) hover(null);
    },
    onPointerMove(e) {
      const press = longPress.current;
      if (press && !press.fired && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) endPress();
      const key = keyOf(e);
      if (key != null) follow(key);
    },
  };
  const { isFocusVisible: focusVisible } = useFocusVisible();
  React.useEffect(trackPointer, []);

  // Under Autocomplete the field drives the grid: its id, virtual focus and the keys it forwards.
  const selectable = React.useContext(SelectableCollectionContext) as { ref?: React.Ref<HTMLElement>; filter?: unknown } | null;
  const { ref: fieldRef, filter: _filter, ...collectionProps } = (virtual && selectable) || {};
  const merged = React.useMemo(() => mergeRefs(listRef, probeRoot, ref, userKeys, region, fieldRef), [listRef, probeRoot, ref, userKeys, region, fieldRef]);
  const { listBoxProps } = useListBox(
    {
      ...mergeProps(collectionProps, {
        id: virtual ? undefined : picker.listId,
        "aria-label": aria["aria-label"] ?? (searching ? labels.searchResults : labels.emojiList),
        "aria-labelledby": aria["aria-labelledby"],
      }),
      keyboardDelegate: navigation,
      layoutDelegate: geometry.layoutDelegate,
      isVirtualized: true,
      orientation,
      escapeKeyBehavior: "none",
      shouldFocusWrap: false,
      onAction: pick,
      onFocus(e: React.FocusEvent) {
        // Real DOM focus only: virtual focus (aria-activedescendant) dispatches focus events too.
        const cell = cellOf(e.target);
        if (!cell || e.target !== document.activeElement) return;
        const id = cell.getAttribute("data-key");
        lastFocused.current = id;
        marks.stop.set(id);
        setActive(marks.hovered.get() ?? id);
        if (focusModel === "input" && !domFocus) setDomFocus(true);
      },
      onBlur(e: React.FocusEvent) {
        if (!e.nativeEvent.isTrusted || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        if (domFocus) setDomFocus(false);
        setActive(marks.hovered.get());
      },
    },
    state,
    listRef,
  );
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();
  const listId = (listBoxProps.id as string | undefined) ?? picker.listId;
  const collectionId = (listBoxProps as { "data-collection"?: string })["data-collection"];
  const cells = React.useMemo<Cells>(
    () => ({
      state,
      listId,
      collectionId,
      focusVisible,
      position(id) {
        const grid = latest.current.geometry.grid();
        const index = grid.indexOf(String(id));
        const at = grid.locate(index);
        return at ? [at.index + 1, at.section.items.length, index] : undefined;
      },
      components,
      cellClassName,
      headerClassName,
      virtual,
      marks,
      reveal: (id) => latest.current.geometry.reveal(id),
      sectionDomId: (id) => `${picker.listId}-section-${id}`,
      toggle: (id) => picker.collapse.toggle(id),
    }),
    [state, listId, collectionId, focusVisible, components, cellClassName, headerClassName, virtual, marks, picker.listId, picker.collapse],
  );
  // React Aria's per-item focus, for every cell at once: the focused key's cell gets DOM focus
  // (grid) or virtual focus (the field's aria-activedescendant), when it changes or mounts.
  const applied = React.useRef<{ el: Element | null; virtual: boolean }>({ el: null, virtual });
  React.useEffect(() => {
    const m = state.selectionManager;
    const el = m.isFocused ? cellElement(m.focusedKey) : null;
    const last = applied.current;
    applied.current = { el, virtual };
    if (!el || (el === last.el && virtual === last.virtual)) return;
    if (virtual) moveVirtualFocus(el);
    else if (document.activeElement !== el) el.focus({ preventScroll: true });
  });
  // A move from the keyboard (or hover) with focus in the grid lands focus on the cell once rendered.
  React.useLayoutEffect(() => {
    const el = cellElement(pendingFocus.current);
    if (!el) return;
    pendingFocus.current = null;
    el.focus({ preventScroll: true });
  });

  const varied = variations && collection.emoji(variations.key);
  const isEmpty = collection.size === 0;
  return {
    state,
    collection,
    cells,
    focusedKey,
    applyHighlight,
    syncStop,
    gridProps: {
      ...mergeProps(listBoxProps, focusProps, cellHandlers),
      ref: merged,
      // One tab stop, a cell, never the grid itself. (Under Autocomplete the grid has no
      // tabindex: Autocomplete turns virtual focus off for a collection that has one.)
      tabIndex: fieldRef ? undefined : -1,
      "data-slot": SLOTS.list,
      "data-orientation": orientation,
      "data-layout": "grid",
      "data-empty": isEmpty || undefined,
      "data-focused": isFocused || undefined,
      "data-focus-visible": isFocusVisible || undefined,
      "data-results": searching ? picker.searchResults : undefined,
      "aria-busy": (searching && picker.pending) || undefined,
    } as React.HTMLAttributes<HTMLElement> & { ref: React.RefCallback<HTMLElement> },
    variations: varied ? (
      <Variations
        record={varied.record}
        style={geometry.overlay(variations.key)}
        onPick={(unified) => {
          closeVariations(true);
          picker.pick(unified);
        }}
        onClose={closeVariations}
      />
    ) : null,
  };
}

/** A cell's props (its glyph as children) for its marks, and whether it's active (hovered or highlighted). */
export function cellProps(cells: Cells, item: EmojiItem, flags: number, artwork: ArtworkMap | null) {
  const { selectionManager: m } = cells.state;
  const { record, unified } = item;
  const position = cells.position(item.id);
  const isFocused = m.isFocused && m.focusedKey === item.id;
  const isSelected = m.selectionMode !== "none" && m.isSelected(item.id);
  const highlighted = cells.virtual && isFocused;
  const isActive = Boolean(flags & ACTIVE) || highlighted;
  const props = {
    id: `${cells.listId}-option-${item.id}`,
    role: "option",
    "aria-label": item.label,
    "aria-selected": m.selectionMode === "none" ? undefined : isSelected,
    "aria-posinset": position?.[0],
    "aria-setsize": position?.[1],
    tabIndex: flags & STOP ? 0 : -1,
    className: cells.cellClassName ?? "",
    "data-slot": SLOTS.emoji,
    "data-key": item.id,
    "data-collection": cells.collectionId,
    "data-unified": unified,
    "data-index": position?.[2],
    "data-selected": isSelected || undefined,
    "data-hovered": flags & HOVERED ? true : undefined,
    "data-focused": isFocused || undefined,
    "data-focus-visible": (isFocused && cells.focusVisible) || undefined,
    "data-pressed": flags & PRESSED ? true : undefined,
    "data-selection-mode": m.selectionMode === "none" ? undefined : m.selectionMode,
    "data-highlighted": highlighted ? "" : undefined,
    "data-active": isActive ? "" : undefined,
    "data-overridden": artwork && findArtwork(artwork, unified) !== undefined ? "" : undefined,
    "data-has-variations": record.tones.length && !record.imageUrl ? "" : undefined,
    children: <Glyph unified={unified} record={record} animate={isActive} />,
  };
  return { props, isActive };
}

export type UseEmojiGridOptions = {
  /** Emoji per row. Default: Root's `columns`, else 9. */
  columns?: number;
  /** A row of emoji, in px (your virtualizer's size for it). */
  rowHeight: number;
  /** A section title, in px. Default `rowHeight`. */
  headerHeight?: number;
  /**
   * Scrolls your virtualizer to a row: `(index, options) => virtualizer.scrollToIndex(index, options)`.
   * Without it the grid's scroll container is scrolled directly.
   */
  scrollToIndex?: (index: number, options: { align: "start" | "end" }) => void;
  /** A value picker: the emoji shown as chosen, with `aria-selected`. */
  value?: string | null;
  "aria-label"?: string;
};

/** The grid's scroll container, and its window in grid px. */
function windowOf(list: HTMLElement | null) {
  let el = list?.parentElement;
  while (el && !/auto|scroll/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
  return list && el ? { el, top: el.getBoundingClientRect().top + el.clientTop - list.getBoundingClientRect().top, height: el.clientHeight } : null;
}

/**
 * The picker's grid for a virtualizer you bring (TanStack Virtual, react-window, Virtuoso): its
 * rows (core/grid), and props for the grid, the section titles and the cells, with the keyboard,
 * highlight, hover, presses and skin-tone variations of EmojiPicker.List. Inside EmojiPicker.Root.
 */
export function useEmojiGrid({ columns, rowHeight, headerHeight = rowHeight, scrollToIndex, value, "aria-label": label }: UseEmojiGridOptions) {
  const picker = usePicker("useEmojiGrid");
  const { sections, request, probeRoot } = useGridSections(false);
  const grid = React.useMemo(() => createEmojiGrid(sections, { columns: columns ?? picker.columns ?? 9, rowHeight, headerHeight }), [sections, columns, picker.columns, rowHeight, headerHeight]);
  const listRef = React.useRef<HTMLElement | null>(null);
  const latest = React.useRef({ grid, rowHeight, headerHeight, scrollToIndex });
  latest.current = { grid, rowHeight, headerHeight, scrollToIndex };
  const [geometry] = React.useState<GridGeometry>(() => {
    const g = () => latest.current.grid;
    const rowOf = (key: Key) => g().locate(g().indexOf(String(key)))?.row ?? -1;
    const scroll = (index: number, align: "start" | "end") => {
      const v = windowOf(listRef.current);
      const row = g().rows[index];
      if (latest.current.scrollToIndex) latest.current.scrollToIndex(index, { align });
      else if (v && row) v.el.scrollTop += align === "start" ? row.offset - v.top : row.offset + row.size - v.top - v.height;
    };
    const visible = (r: EmojiGridRow, inset = 0) => {
      const v = windowOf(listRef.current);
      return Boolean(v && r.offset + r.size > v.top + inset && r.offset < v.top + v.height);
    };
    return {
      grid: g,
      navigation: new EmojiGridNavigation(() => ({ grid: g(), strip: null, metrics: { cellHeight: latest.current.rowHeight, headerHeight: latest.current.headerHeight } })),
      firstVisible() {
        const row = g().rows.find((r) => r.type === "emojis" && visible(r, (r.section.header ? latest.current.headerHeight : 0) + 1));
        return row?.type === "emojis" ? row.items[0]!.id : (g().at(0)?.id ?? null);
      },
      isVisible: (key) => Boolean(g().rows[rowOf(key)] && visible(g().rows[rowOf(key)]!)),
      /** Into view; scrolling up to a section's first row brings its title along. */
      reveal(key) {
        const index = rowOf(key);
        const v = windowOf(listRef.current);
        const row = g().rows[index];
        if (!v || !row) return;
        if (row.offset < v.top) scroll(g().rows[index - 1]?.type === "header" ? index - 1 : index, "start");
        else if (row.offset + row.size > v.top + v.height) scroll(index, "end");
      },
      viewport: () => windowOf(listRef.current)?.height ?? 0,
      jump(id) {
        const index = g().rows.findIndex((r) => r.section.id === id);
        if (index >= 0) scroll(index, "start");
        return index >= 0;
      },
      overlay(key) {
        const list = listRef.current;
        const cell = list?.querySelector(`[data-key="${CSS.escape(String(key))}"]`);
        if (!list || !cell) return { position: "absolute", visibility: "hidden" };
        const [l, c] = [list.getBoundingClientRect(), cell.getBoundingClientRect()];
        const above = c.top - l.top - c.height;
        const left = Math.max(0, Math.min(c.left - l.left - 2.5 * c.width, l.width - 6 * c.width));
        return { position: "absolute", top: list.offsetTop + (above >= (windowOf(list)?.top ?? 0) ? above : c.bottom - l.top), insetInlineStart: list.offsetLeft + left };
      },
    };
  });
  const controller = useGridController({ sections, geometry, orientation: "vertical", listRef, probeRoot, value, "aria-label": label });
  const { cells } = controller;
  React.useSyncExternalStore(cells.marks.subscribe, () => [cells.marks.stop.get(), cells.marks.active.get(), cells.marks.hovered.get(), cells.marks.pressed.get()].join("\n"));
  const artwork = useArtworkMap();

  // After each render and scroll: the search highlight, the tab stop, the current section, and probes of what's shown.
  const sync = React.useRef(() => {});
  sync.current = () => {
    controller.applyHighlight();
    controller.syncStop();
    const v = windowOf(listRef.current);
    const shown = v ? grid.rows.filter((r) => r.offset + r.size > v.top && r.offset < v.top + v.height) : [];
    request(shown.flatMap((r) => (r.type === "emojis" ? r.items.map((i) => i.unified) : [])));
    if (!picker.searching && shown[0]) picker.activeSection.set(shown[0].section.id);
  };
  React.useLayoutEffect(() => sync.current());
  React.useEffect(() => {
    const el = windowOf(listRef.current)?.el;
    const onScroll = () => sync.current();
    el?.addEventListener("scroll", onScroll, { passive: true });
    return () => el?.removeEventListener("scroll", onScroll);
  }, []);

  return {
    ...grid,
    getGridProps: (props: React.HTMLAttributes<HTMLElement> = {}) => mergeProps(props, controller.gridProps) as typeof controller.gridProps,
    getHeaderProps: (section: EmojiSection) => ({ role: "presentation", "data-slot": SLOTS.categoryHeader, children: section.name }),
    getCellProps: (item: EmojiItem) => ({
      ...cellProps(cells, item, cells.marks.of(item.id), artwork).props,
      ref: (el: HTMLElement | null) => void (el && (el.scrollIntoView = () => cells.reveal(item.id))),
    }),
    variations: controller.variations,
  };
}
