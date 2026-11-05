import * as React from "react";
import type { Key, LayoutDelegate } from "@react-types/shared";
import { useFocusRing } from "react-aria/useFocusRing";
import { useFocusVisible } from "react-aria/useFocusVisible";
import { useListBox } from "react-aria/useListBox";
import { mergeProps } from "react-aria/mergeProps";
import { useListState, type ListState } from "react-stately/useListState";
import { AutocompleteStateContext, SelectableCollectionContext } from "react-aria-components/Autocomplete";
import { createEmojiGrid, type EmojiGrid, type EmojiGridMove, type EmojiGridRow } from "../../core/grid";
import type { PickerState } from "../../core/picker";
import type { EmojiItem, EmojiSection } from "../../core/sections";
import { EmojiCollection } from "./collection";

import { signal, usePicker, useSelector, type ListHandle } from "../root/context";
import { Glyph } from "../emoji/glyph";
import { mergeRefs } from "react-aria/mergeRefs";
import { useKeyRegion, useUserKeyDown, type PickerKeyboardEventHandler } from "../root/keyboard";
import type { ListProps } from "./list";
import type { KeyboardAction } from "../root/keymap";
import { EmojiGridNavigation } from "./navigation";
import { useDrawable } from "../emoji/native-support";
import { findArtwork, useArtworkMap, type ArtworkMap } from "../emoji/overrides";
import { PopoverContext } from "../popover/popover-context";
import { SLOTS } from "../utils/slots";
import { Variations } from "./variations";
import { moveVirtualFocus } from "./virtual-focus";

// Hover moves the keyboard position only on a real pointer move: a keyboard scroll slides cells under a resting pointer
const pointer = { x: NaN, y: NaN, moved: false, tracking: false, list: null as Element | null, within: false };
function trackPointer() {
  if (pointer.tracking) return;
  pointer.tracking = true;
  addEventListener(
    "pointermove",
    (e) => {
      const list = cellOf(e.target)?.closest(`[data-slot="${SLOTS.list}"]`) ?? null;
      pointer.moved = e.clientX !== pointer.x || e.clientY !== pointer.y;
      pointer.within = list !== null && list === pointer.list;
      pointer.list = list;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    },
    { capture: true, passive: true },
  );
}

const STOP = 1;
const ACTIVE = 2;
const HOVERED = 4;
const PRESSED = 8;
const FOCUSED = 16;
function cellMarks(state: PickerState<React.ReactNode>) {
  const marks = { stop: signal<Key | null>(null), pressed: signal<Key | null>(null) };
  return {
    ...marks,
    subscribe(listener: () => void) {
      const off = [marks.stop.subscribe(listener), marks.pressed.subscribe(listener), state.subscribe(listener)];
      return () => off.forEach((f) => f());
    },
    of(key: Key) {
      const { hovered, highlighted } = state.getSnapshot();
      return (marks.stop.get() === key ? STOP : 0) | ((hovered ?? highlighted) === key ? ACTIVE : 0) | (hovered === key ? HOVERED : 0) | (marks.pressed.get() === key ? PRESSED : 0) | (highlighted === key ? FOCUSED : 0);
    },
  };
}

export type Cells = {
  selection: ListState<unknown>["selectionManager"];
  listId: string;
  collectionId?: string;
  focusVisible: boolean;
  position: (id: Key) => readonly [number, number, number] | undefined;
  virtual: boolean;
  marks: ReturnType<typeof cellMarks>;
  reveal(id: Key): void;
  sectionDomId(id: string): string;
  toggle(id: string): void;
};

export type GridGeometry = {
  grid(): EmojiGrid<EmojiSection>;
  navigation: EmojiGridNavigation;
  layoutDelegate?: LayoutDelegate;
  firstVisible(): Key | null;
  isVisible(key: Key): boolean;
  reveal(key: Key, from?: Key): void;
  viewport(): number;
  jump(section: string, instant: boolean): boolean;
  overlay(key: Key): React.CSSProperties;
};

const MOVES: Partial<Record<KeyboardAction, EmojiGridMove>> = { "move-up": "up", "move-down": "down", "move-left": "left", "move-right": "right", "page-up": "page-up", "page-down": "page-down", first: "first", last: "last" };
const LONG_PRESS_MS = 500;
const NO_KEYS: Key[] = [];
const baseOf = (unified: string) => unified.toLowerCase().replace(/-1f3f[b-f]/g, "");
export const isRtl = (el: Element | null | undefined) => (el ? getComputedStyle(el).direction === "rtl" : false);
const cellOf = (target: EventTarget | null) => (target instanceof Element ? target.closest(`[data-slot="${SLOTS.emoji}"]`) : null);

export function useGridSections(horizontal: boolean) {
  const picker = usePicker("EmojiPicker.List");
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
  return { sections: picker.searching ? picker.sections : categories, request, probeRoot };
}

type ControllerOptions = Pick<ListProps, "onKeyDown" | "aria-label" | "aria-labelledby"> & {
  sections: readonly EmojiSection[];
  geometry: GridGeometry;
  orientation: "vertical" | "horizontal";
  listRef: React.RefObject<HTMLElement | null>;
  ref?: React.Ref<HTMLElement>;
  probeRoot?: React.Ref<HTMLElement>;
  loader?: boolean;
};

export function useGridController({ sections, geometry, orientation, listRef, ref, probeRoot, loader = false, onKeyDown, ...aria }: ControllerOptions) {
  const picker = usePicker("EmojiPicker.List");
  const { labels, searching, focusModel, value } = picker;
  const { navigation } = geometry;
  const collection = React.useMemo(() => new EmojiCollection(sections, loader), [sections, loader]);
  const selected = React.useMemo(() => (value == null ? undefined : sections.flatMap((s) => s.items.filter((i) => baseOf(i.unified) === baseOf(value)).map((i) => i.id))), [value, sections]);
  const state = useListState<unknown>({ collection, selectionMode: value === undefined ? "none" : "single", selectedKeys: selected ?? NO_KEYS, disallowEmptySelection: value !== undefined, layoutDelegate: geometry.layoutDelegate });
  const stateRef = React.useRef(state);
  stateRef.current = state;
  const autocomplete = React.useContext(AutocompleteStateContext);
  const core = picker.state;
  const { virtual } = picker;
  const [marks] = React.useState(() => cellMarks(core));
  const [persisted] = React.useState(() => new Set<Key>());
  const focusGrid = React.useRef(Boolean(React.useContext(PopoverContext)?.focusGrid));
  const lastFocused = React.useRef<Key | null>(null);
  // After a key move, hover takes over only once the pointer moves: VoiceOver moves the pointer to what it reads, lagging focus
  const keyed = React.useRef(false);
  const latest = React.useRef({ collection, virtual, geometry, searching });
  latest.current = { collection, virtual, geometry, searching };

  const highlight = (): string | null => core.getSnapshot().highlighted;
  const position = React.useRef<Key | null>(null);
  const lastKey = () => highlight() ?? position.current;
  const setHighlight = (key: Key | null) => {
    core.highlight(key == null ? null : String(key));
    persisted.clear();
    if (key == null) return;
    persisted.add(key);
    position.current = key;
    if (latest.current.searching) kept.current.unified = latest.current.collection.emoji(key)?.unified;
  };

  const moveTo = (key: Key, dom: boolean, from?: Key) => {
    geometry.reveal(key, from);
    setHighlight(key);
    if (dom) marks.stop.set(key);
  };

  const pick = (key: Key) => {
    const it = latest.current.collection.emoji(key);
    if (it) picker.pick(it.unified);
  };

  const focusInput = () => listRef.current?.closest(`[data-slot="${SLOTS.root}"]`)?.querySelector<HTMLElement>(`[data-slot="${SLOTS.searchInput}"]`) ?? null;
  const cellElement = (key: Key | null | undefined) => (key == null ? null : (listRef.current?.querySelector<HTMLElement>(`[data-slot="${SLOTS.emoji}"][data-key="${CSS.escape(String(key))}"]`) ?? null));

  const variations = useSelector(core, (s) => s.variations);
  const back = React.useRef<HTMLElement | null>(null);
  const openVariations = (key: Key | null) => {
    const active = document.activeElement;
    if (!core.openVariations(key == null ? null : String(key))) return false;
    back.current = active instanceof HTMLElement ? active : null;
    return true;
  };
  const closeVariations = (restore: boolean) => {
    const key = core.getSnapshot().variations;
    if (key == null) return;
    core.closeVariations();
    if (!restore) return;
    (back.current ?? cellElement(key))?.focus({ preventScroll: true });
    setHighlight(key);
  };

  const handle: ListHandle = {
    key(action, from, event) {
      const dom = from === "list";
      if (dom) keyed.current = true;
      if (action === "select") {
        const key = highlight();
        if (key == null) return false;
        pick(key);
        return true;
      }
      let move = action;
      if (isRtl(listRef.current) && (move === "move-left" || move === "move-right")) move = move === "move-left" ? "move-right" : "move-left";
      const current = (dom ? cellOf(event?.target ?? null)?.getAttribute("data-key") : null) ?? highlight();
      if (current == null) {
        const start = move === "first" ? navigation.getFirstKey() : move === "last" ? navigation.getLastKey() : move === "move-down" || move === "move-right" || move === "page-down" ? geometry.firstVisible() : null;
        if (start == null) return false;
        moveTo(start, dom);
        return true;
      }
      const to = MOVES[move];
      if (!to) return false;
      const next = navigation.move(current, to, geometry.viewport());
      if (next == null || next === current) {
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
      if (!latest.current.virtual || highlight() == null) return false;
      setHighlight(null);
      autocomplete?.setFocusedNodeId(null);
      return true;
    },
    focus() {
      const last = lastKey();
      const key = latest.current.collection.emoji(last) ? last : geometry.firstVisible();
      if (key == null) return false;
      core.setDomFocus(true);
      moveTo(key, true);
      return true;
    },
    jump(id, { instant = false } = {}) {
      if (!geometry.jump(id, instant)) return;
      core.setActiveSection(id);
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

  // React Aria builds the new collection in a later render, so the highlight is applied once a render has it
  const kept = React.useRef<{ query: string; unified?: string }>({ query: "" });
  const pendingHighlight = React.useRef<{ key: Key | null } | null>(null);
  React.useLayoutEffect(() => {
    if (!searching) {
      if (kept.current.query) {
        kept.current = { query: "" };
        pendingHighlight.current = { key: null };
        applyHighlight();
      }
      return;
    }
    const all = sections.flatMap((s) => s.items);
    const focused = lastKey();
    const unified = all.find((i) => i.id === focused)?.unified ?? kept.current.unified;
    const previous = kept.current.query === picker.query ? all.find((i) => i.unified === unified) : undefined;
    const target = previous ?? all[0];
    kept.current = { query: picker.query, unified: target?.unified };
    pendingHighlight.current = { key: target?.id ?? null };
    applyHighlight();
  }, [sections]);
  const applyHighlight = () => {
    const pending = pendingHighlight.current;
    if (!pending || (pending.key != null && !latest.current.collection.getItem(pending.key))) return;
    pendingHighlight.current = null;
    if (pending.key != null && !(latest.current.virtual && document.activeElement === focusInput())) position.current = pending.key;
    else setHighlight(pending.key);
  };

  const syncStop = () => {
    const list = listRef.current;
    if (list?.contains(document.activeElement) && document.activeElement !== list) return void (focusGrid.current = false);
    const { collection, geometry } = latest.current;
    const stop = marks.stop.get();
    if (stop == null || !geometry.isVisible(stop) || !collection.emoji(stop)) marks.stop.set(collection.emoji(lastFocused.current) && geometry.isVisible(lastFocused.current!) ? lastFocused.current : geometry.firstVisible());
    const cell = focusGrid.current ? cellElement(marks.stop.get()) : null;
    if (!cell) return;
    focusGrid.current = false;
    const root = cell.closest(`[data-slot="${SLOTS.root}"]`);
    if (root && !root.contains(document.activeElement) && !root.querySelector("[data-autofocus]")) cell.focus({ preventScroll: true });
  };

  // Set the focused key before React Aria sees DOM focus, or it treats focus as entering with no key and jumps to the first cell
  React.useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onFocusIn = (e: FocusEvent) => {
      const id = cellOf(e.target)?.getAttribute("data-key");
      const manager = stateRef.current.selectionManager;
      if (id == null || e.target !== document.activeElement || manager.isFocused || manager.focusedKey === id) return;
      manager.setFocusedKey(id);
    };
    el.addEventListener("focusin", onFocusIn);
    return () => el.removeEventListener("focusin", onFocusIn);
  }, []);

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

  const hover = (key: Key | null) => core.hover(key == null ? null : String(key));
  const follow = (key: Key) => {
    if (!pointer.moved || picker.pointer !== "follows" || lastKey() === key) return;
    const active = document.activeElement;
    const list = listRef.current;
    const root = list?.closest(`[data-slot="${SLOTS.root}"]`);
    if (list?.contains(active) && active !== list) {
      if (keyed.current && !pointer.within) return;
      keyed.current = false;
      setHighlight(key);
      marks.stop.set(key);
    } else if (virtual && active instanceof HTMLInputElement && root?.contains(active)) setHighlight(key);
  };
  const keyOf = (e: React.SyntheticEvent) => cellOf(e.target)?.getAttribute("data-key") ?? null;
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
      e.preventDefault();
      if (e.pointerType === "touch") return;
      if (virtual) setHighlight(key);
      else cellElement(key)?.focus({ preventScroll: true });
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
      if (virtual && (e.nativeEvent as PointerEvent).pointerType === "touch") setHighlight(key);
      pick(key);
    },
    onPointerOver(e) {
      const key = keyOf(e);
      if (e.pointerType !== "touch" && key !== core.getSnapshot().hovered) hover(key);
    },
    onPointerOut(e) {
      const cell = cellOf(e.target);
      if (cell && !cell.contains(e.relatedTarget as Node | null) && core.getSnapshot().hovered === cell.getAttribute("data-key")) hover(null);
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
        // Real DOM focus only: virtual focus (aria-activedescendant) dispatches focus events too
        const cell = cellOf(e.target);
        if (!cell || e.target !== document.activeElement) return;
        const id = cell.getAttribute("data-key");
        lastFocused.current = id;
        marks.stop.set(id);
        setHighlight(id);
        if (focusModel === "input") core.setDomFocus(true);
      },
      onBlur(e: React.FocusEvent) {
        if (!e.nativeEvent.isTrusted || e.currentTarget.contains(e.relatedTarget as Node | null)) return;
        keyed.current = false;
        core.setDomFocus(false);
        setHighlight(null);
      },
    },
    state,
    listRef,
  );
  const { focusProps, isFocused, isFocusVisible } = useFocusRing();
  const listId = (listBoxProps.id as string | undefined) ?? picker.listId;
  const collectionId = (listBoxProps as { "data-collection"?: string })["data-collection"];
  const selection = state.selectionManager;
  const cells = React.useMemo<Cells>(
    () => ({
      selection,
      listId,
      collectionId,
      focusVisible,
      position(id) {
        const grid = latest.current.geometry.grid();
        const index = grid.indexOf(String(id));
        const at = grid.locate(index);
        return at ? [at.index + 1, at.section.items.length, index] : undefined;
      },
      virtual,
      marks,
      reveal: (id) => latest.current.geometry.reveal(id),
      sectionDomId: (id) => `${picker.listId}-section-${id}`,
      toggle: (id) => picker.collapse.toggle(id),
    }),
    [selection.selectedKeys, selection.selectionMode, listId, collectionId, focusVisible, virtual, marks, picker.listId, picker.collapse],
  );

  const varied = variations != null ? collection.emoji(variations) : undefined;
  const isEmpty = collection.size === 0;
  return {
    state,
    collection,
    cells,
    persisted,
    applyHighlight,
    syncStop,
    gridProps: {
      ...mergeProps(listBoxProps, focusProps, cellHandlers),
      ref: merged,
      // No tabindex under Autocomplete: it turns virtual focus off for a collection that has one
      tabIndex: fieldRef ? undefined : -1,
      "data-slot": SLOTS.list,
      "data-orientation": orientation,
      "data-layout": "grid",
      "data-empty": isEmpty || undefined,
      "data-focused": isFocused || undefined,
      "data-focus-visible": isFocusVisible || undefined,
      "data-searching": searching || undefined,
      "data-results": searching ? picker.searchResults : undefined,
      "aria-busy": (searching && picker.pending) || undefined,
    } as React.HTMLAttributes<HTMLElement> & { ref: React.RefCallback<HTMLElement> },
    variations: varied ? (
      <Variations
        record={varied.record}
        style={geometry.overlay(variations!)}
        onPick={(unified) => {
          closeVariations(true);
          picker.pick(unified);
        }}
        onClose={closeVariations}
      />
    ) : null,
  };
}

export type CellState = { emoji: EmojiItem; highlighted: boolean; active: boolean; hovered: boolean; focused: boolean; focusVisible: boolean; pressed: boolean; selected: boolean };

function cellProps(cells: Cells, item: EmojiItem, flags: number, artwork: ArtworkMap | null) {
  const { selection: m } = cells;
  const { record, unified } = item;
  const position = cells.position(item.id);
  const isFocused = Boolean(flags & FOCUSED);
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
    children: <Glyph unified={unified} record={record} animate={isActive && Boolean(record.animated)} />,
  };
  const state: CellState = { emoji: item, highlighted, active: isActive, hovered: Boolean(flags & HOVERED), focused: isFocused, focusVisible: isFocused && cells.focusVisible, pressed: Boolean(flags & PRESSED), selected: isSelected };
  return { props, state };
}

declare const gridState: unique symbol;
export type EmojiGridState = { readonly [gridState]: true };

export function useCell(grid: Cells, item: EmojiItem) {
  const artwork = useArtworkMap();
  const flags = React.useSyncExternalStore(grid.marks.subscribe, () => grid.marks.of(item.id));
  const element = React.useRef<HTMLElement | null>(null);
  const ref = React.useCallback(
    (el: HTMLElement | null) => {
      element.current = el;
      // React Aria's scrollIntoViewport would scroll the page too; the keyboard moves already scrolled the scroller
      if (el) el.scrollIntoView = () => grid.reveal(item.id);
    },
    [grid, item.id],
  );
  const focused = Boolean(flags & FOCUSED);
  React.useLayoutEffect(() => {
    const el = element.current;
    if (!el || !focused) return;
    if (grid.virtual) moveVirtualFocus(el);
    else if (el.ownerDocument.activeElement !== el) el.focus({ preventScroll: true });
  }, [focused, grid.virtual]);
  const { props, state } = cellProps(grid, item, flags, artwork);
  return { cellProps: { ...props, ref }, state };
}

export type UseEmojiGridOptions = {
  columns?: number;
  rowHeight: number;
  headerHeight?: number;
  scrollToIndex?: (index: number, options: { align: "start" | "end" }) => void;
  "aria-label"?: string;
};

function windowOf(list: HTMLElement | null) {
  let el = list?.parentElement;
  while (el && !/auto|scroll/.test(getComputedStyle(el).overflowY)) el = el.parentElement;
  return list && el ? { el, top: el.getBoundingClientRect().top + el.clientTop - list.getBoundingClientRect().top, height: el.clientHeight } : null;
}

export function useEmojiGrid({ columns, rowHeight, headerHeight = rowHeight, scrollToIndex, "aria-label": label }: UseEmojiGridOptions) {
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
  const controller = useGridController({ sections, geometry, orientation: "vertical", listRef, probeRoot, "aria-label": label });

  const sync = React.useRef(() => {});
  sync.current = () => {
    controller.applyHighlight();
    controller.syncStop();
    const v = windowOf(listRef.current);
    const shown = v ? grid.rows.filter((r) => r.offset + r.size > v.top && r.offset < v.top + v.height) : [];
    request(shown.flatMap((r) => (r.type === "emojis" ? r.items.map((i) => i.unified) : [])));
    if (!picker.searching && shown[0]) picker.state.setActiveSection(shown[0].section.id);
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
    state: controller.cells as unknown as EmojiGridState,
    variations: controller.variations,
  };
}

export const useEmojiCell = useCell as unknown as (state: EmojiGridState, item: EmojiItem) => ReturnType<typeof useCell>;
