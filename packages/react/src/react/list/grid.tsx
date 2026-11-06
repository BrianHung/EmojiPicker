import * as React from "react";
import type { Key, LayoutDelegate } from "@react-types/shared";
import { useFocusRing } from "react-aria/useFocusRing";
import { useFocusVisible } from "react-aria/useFocusVisible";
import { useLocale } from "react-aria/I18nProvider";
import { useListBox } from "react-aria/useListBox";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { useListState } from "react-stately/useListState";
import { AutocompleteStateContext, SelectableCollectionContext } from "react-aria-components/Autocomplete";
import { withoutTone } from "@brianhung/emoji-picker-core";
import type { EmojiGrid, EmojiGridMove } from "../state/grid";
import type { PickerState } from "../state/picker";
import type { EmojiSection } from "../state/sections";
import { EmojiCollection } from "./collection";
import { usePicker, type HighlightSource, type ListHandle, type Overlay } from "../root/context";
import { usePickerKeyDown, type KeyResult, type PickerKeyboardEventHandler } from "../utils/keyboard";
import type { ListProps } from "./list";
import type { EmojiGridNavigation } from "./navigation";
import { useDrawable } from "../emoji/native-support";
import { PopoverContext } from "../popover/popover-context";
import { SLOTS } from "../utils/slots";
import { flag, type Orientation } from "../utils/render";
import { moveVirtualFocus } from "../utils/utils";
import { shallowEqual, useStore } from "../utils/store";
import { VariationsPopup } from "./variations";
import { cellOf, createMarks, type Cells, type MarksStore } from "./cell";
import { usePointerHighlight } from "./pointer";

export type GridGeometry = {
  grid(): EmojiGrid<EmojiSection>;
  navigation: EmojiGridNavigation;
  layoutDelegate?: LayoutDelegate;
  firstVisible(): Key | null;
  isVisible(key: Key): boolean;
  reveal(key: Key, from?: Key): void;
  viewport(): number;
  jump(section: string, instant: boolean): boolean;
  overlay(key: Key, cell: Element | null): React.CSSProperties;
};

type Latest = { collection: EmojiCollection; virtual: boolean; geometry: GridGeometry; searching: boolean; rtl: boolean; listId: string };
export type CellElement = (key: Key | null | undefined) => HTMLElement | null;

const MOVES: Record<string, EmojiGridMove> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", PageUp: "page-up", PageDown: "page-down", Home: "first", End: "last" };
const NONE: HighlightSource = {};
const NO_KEYS: Key[] = [];

export function useGridSections(horizontal: boolean) {
  const picker = usePicker("EmojiPicker.List");
  const { searching, categorySections, sections } = useStore(picker.state, ({ searching, categorySections, sections }) => ({ searching, categorySections, sections }), shallowEqual);
  const probeRoot = React.useRef<HTMLElement | null>(null);
  const { drawable, request } = useDrawable(probeRoot);
  const categories = React.useMemo(
    () =>
      horizontal
        ? categorySections
        : categorySections.flatMap((s) => {
            const seen = new Set<string>();
            const items = s.items.filter((i) => drawable(i.record, i.unified) && !seen.has(i.unified) && seen.add(i.unified));
            if (items.length === s.items.length) return [s];
            return items.length || s.collapsed ? [{ ...s, items }] : [];
          }),
    [horizontal, categorySections, drawable],
  );
  return { sections: searching ? sections : categories, request, probeRoot };
}

// A new query keeps the highlighted emoji when it is still a result, and the highlighted cell stays mounted off screen
function useHighlight(core: PickerState<React.ReactNode>, latest: React.RefObject<Latest>, ownsFocus: (el: Element | null) => boolean) {
  const [persisted] = React.useState(() => new Set<Key>());
  const position = React.useRef<Key | null>(null);
  const kept = React.useRef<{ query: string; unified?: string }>({ query: "" });
  const pending = React.useRef<{ key: Key | null } | null>(null);
  const highlighted = (): string | null => core.getSnapshot().highlighted;
  const lastKey = () => highlighted() ?? position.current;
  const setHighlight = (key: Key | null, details = NONE) => {
    core.highlight(key == null ? null : String(key), details);
    persisted.clear();
    if (key == null) return;
    persisted.add(key);
    position.current = key;
    if (latest.current.searching) kept.current.unified = latest.current.collection.emoji(key)?.unified;
  };
  const applyHighlight = () => {
    const next = pending.current;
    if (!next || (next.key != null && !latest.current.collection.getItem(next.key))) return;
    pending.current = null;
    if (next.key != null && !(latest.current.virtual && ownsFocus(document.activeElement))) position.current = next.key;
    else setHighlight(next.key);
  };
  const retain = (sections: readonly EmojiSection[], query: string) => {
    if (!latest.current.searching) {
      if (!kept.current.query) return;
      kept.current = { query: "" };
      pending.current = { key: null };
      return applyHighlight();
    }
    const all = sections.flatMap((s) => s.items);
    const focused = lastKey();
    const unified = all.find((i) => i.id === focused)?.unified ?? kept.current.unified;
    const previous = kept.current.query === query ? all.find((i) => i.unified === unified) : undefined;
    const target = previous ?? all[0];
    kept.current = { query, unified: target?.unified };
    pending.current = { key: target?.id ?? null };
    applyHighlight();
  };
  return { persisted, highlighted, lastKey, setHighlight, applyHighlight, retain };
}

export type Highlight = ReturnType<typeof useHighlight>;

// One cell is the list's tab stop; a popover that asks for it also gets focus there on open
function useFocusStop(listRef: React.RefObject<HTMLElement | null>, marks: MarksStore, latest: React.RefObject<Latest>, cellElement: CellElement) {
  const focusGrid = React.useRef(Boolean(React.useContext(PopoverContext)?.focusGrid));
  const lastFocused = React.useRef<Key | null>(null);
  const syncStop = () => {
    const list = listRef.current;
    if (list?.contains(document.activeElement) && document.activeElement !== list) return void (focusGrid.current = false);
    const { collection, geometry } = latest.current;
    const stop = marks.getSnapshot().stop;
    if (stop == null || !geometry.isVisible(stop) || !collection.emoji(stop)) marks.dispatch({ stop: collection.emoji(lastFocused.current) && geometry.isVisible(lastFocused.current!) ? lastFocused.current : geometry.firstVisible() });
    const cell = focusGrid.current ? cellElement(marks.getSnapshot().stop) : null;
    if (!cell) return;
    focusGrid.current = false;
    // On mount this runs before the root's ref attaches and maybe before the search field mounts, so it asks the DOM
    const root = cell.closest(`[data-slot="${SLOTS.root}"]`);
    if (root && !root.contains(document.activeElement) && !root.querySelector("[data-autofocus]")) cell.focus({ preventScroll: true });
  };
  return { lastFocused, syncStop };
}

function useVariations(core: PickerState<React.ReactNode>, cellElement: CellElement, setHighlight: (key: Key | null) => void) {
  const back = React.useRef<HTMLElement | null>(null);
  const open = (id: Key | null) => {
    const active = document.activeElement;
    if (!core.openVariations(id == null ? null : String(id))) return false;
    back.current = active instanceof HTMLElement ? active : null;
    return true;
  };
  const close = (restore: boolean) => {
    const id = core.getSnapshot().variations;
    if (id == null) return;
    core.closeVariations();
    if (!restore) return;
    (back.current ?? cellElement(id))?.focus({ preventScroll: true });
    setHighlight(id);
  };
  return { open, close };
}

// The search field's aria-activedescendant is React Aria's focused node, which follows virtual focus events: re-send them for the highlight, and clear one that left the collection
function useActiveDescendant(core: PickerState<React.ReactNode>, latest: React.RefObject<Latest>, cellElement: CellElement, target: () => Element | null, ownsFocus: (el: Element | null) => boolean) {
  const autocomplete = React.useContext(AutocompleteStateContext);
  const ref = React.useRef(autocomplete);
  ref.current = autocomplete;
  const sync = React.useCallback(() => {
    const state = ref.current;
    const key = core.getSnapshot().highlighted;
    const valid = latest.current.virtual && key != null && latest.current.collection.emoji(key);
    const cell = valid ? cellElement(key) : null;
    // Only while the field or keyboard target has focus: React Aria pulls focus back to the field on a virtual focus event
    if (cell && ownsFocus(document.activeElement)) moveVirtualFocus(cell, target());
    // React Aria delays a new id while typing; until then the field must not point at a removed option
    const stale = state?.focusedNodeId != null && !document.getElementById(state.focusedNodeId);
    if (stale || (!valid && state?.focusedNodeId != null)) state!.setFocusedNodeId(null);
  }, [core, target, ownsFocus]);
  React.useLayoutEffect(sync);
  React.useEffect(() => core.subscribe(() => queueMicrotask(sync)), [core, sync]);
}

type ControllerOptions = Pick<ListProps, "aria-label" | "aria-labelledby"> & {
  onKeyDown?: PickerKeyboardEventHandler<HTMLElement>;
  sections: readonly EmojiSection[];
  geometry: GridGeometry;
  orientation: Orientation;
  listRef: React.RefObject<HTMLElement | null>;
  ref?: React.Ref<HTMLElement>;
  probeRoot?: React.Ref<HTMLElement>;
};

export function useGridController({ sections, geometry, orientation, listRef, ref, probeRoot, onKeyDown, ...aria }: ControllerOptions) {
  const picker = usePicker("EmojiPicker.List");
  const { labels, value, state: core } = picker;
  const { searching, virtual, query, pending } = useStore(core, (s) => ({ searching: s.searching, virtual: s.focus === "virtual", query: s.query, pending: s.pending }), shallowEqual);
  const { navigation } = geometry;
  const collection = React.useMemo(() => new EmojiCollection(sections), [sections]);
  const selected = React.useMemo(() => (value == null ? undefined : sections.flatMap((s) => s.items.filter((i) => withoutTone(i.unified) === withoutTone(value)).map((i) => i.id))), [value, sections]);
  const state = useListState<unknown>({ collection, selectionMode: value === undefined ? "none" : "single", selectedKeys: selected ?? NO_KEYS, disallowEmptySelection: value !== undefined, layoutDelegate: geometry.layoutDelegate });
  const autocomplete = React.useContext(AutocompleteStateContext);
  const [marks] = React.useState(createMarks);
  const [elements] = React.useState(() => new Map<Key, HTMLElement>());
  const [headers] = React.useState(() => new Set<HTMLElement>());
  const cellElement: CellElement = (key) => (key == null ? null : (elements.get(key) ?? null));
  // After a key move, hover takes over only once the pointer moves: VoiceOver moves the pointer to what it reads, lagging focus
  const keyed = React.useRef(false);
  const rtl = useLocale().direction === "rtl";
  const latest = React.useRef<Latest>({ collection, virtual, geometry, searching, rtl, listId: picker.listId });
  latest.current = { ...latest.current, collection, virtual, geometry, searching, rtl };

  const highlight = useHighlight(core, latest, picker.ownsFocus);
  const { persisted, highlighted, lastKey, setHighlight, applyHighlight, retain } = highlight;
  const { lastFocused, syncStop } = useFocusStop(listRef, marks, latest, cellElement);
  const variations = useVariations(core, cellElement, setHighlight);

  const moveTo = (key: Key, dom: boolean, details = NONE, from?: Key) => {
    geometry.reveal(key, from);
    setHighlight(key, details);
    if (dom) marks.dispatch({ stop: key });
  };
  const pick = (key: Key, event?: Event, reason?: Parameters<ListHandle["pick"]>[1]) => {
    const it = latest.current.collection.emoji(key);
    if (it) picker.pick(it.unified, event, reason);
    return Boolean(it);
  };
  const focusInput = () => picker.searchInput.current;
  const pendingJump = React.useRef<{ id: string; instant: boolean } | null>(null);

  const handle: ListHandle = {
    move(to, details = NONE, cell = null) {
      const dom = cell != null;
      if (dom) keyed.current = true;
      const move = latest.current.rtl && (to === "left" || to === "right") ? (to === "left" ? "right" : "left") : to;
      const key = cell?.getAttribute("data-key") ?? highlighted();
      // A highlight the grid doesn't show (filtered out, or not drawable) moves like no highlight at all
      const current = key != null && latest.current.collection.emoji(key) ? key : null;
      if (current == null) {
        const start = move === "first" ? navigation.getFirstKey() : move === "last" ? navigation.getLastKey() : move === "down" || move === "right" || move === "page-down" ? geometry.firstVisible() : null;
        if (start == null) return false;
        moveTo(start, dom, details);
        return true;
      }
      const next = navigation.move(current, move, geometry.viewport());
      if (next == null || next === current) {
        if (move === "up") {
          if (dom) focusInput()?.focus();
          else if (document.activeElement === focusInput()) handle.clear();
        }
        return true;
      }
      moveTo(next, dom, details, move === "page-down" || move === "page-up" ? current : undefined);
      return true;
    },
    pick(event, reason) {
      const key = highlighted();
      return key != null && pick(key, event, reason);
    },
    highlight(emoji, details) {
      core.highlight(emoji, details);
      const key = highlighted();
      if (key != null) geometry.reveal(key);
      setHighlight(key, details);
    },
    ids() {
      const key = highlighted();
      return { list: latest.current.listId, active: key != null && latest.current.collection.emoji(key) ? `${latest.current.listId}-option-${key}` : undefined };
    },
    clear() {
      if (!latest.current.virtual || highlighted() == null) return false;
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
    jump(id, { instant = false, afterRender = false } = {}) {
      if (afterRender) return void (pendingJump.current = { id, instant });
      const section = sections.find((s) => s.id === id) ?? sections.find((s) => s.category === id);
      if (!section || !geometry.jump(section.id, instant)) return;
      core.setActiveSection(section.id);
      const first = section.items[0]?.id;
      if (first != null) marks.dispatch({ stop: first });
    },
    atStart() {
      const key = highlighted();
      return key != null && key === navigation.getFirstKey();
    },
    variations(target) {
      const cell = cellOf(target);
      return variations.open(cell && listRef.current?.contains(cell) ? cell.getAttribute("data-key") : highlighted());
    },
    overlay(): Overlay | null {
      const key = core.getSnapshot().variations;
      const item = key == null ? undefined : latest.current.collection.emoji(key);
      if (!item) return null;
      return {
        record: item.record,
        style: latest.current.geometry.overlay(key!, cellElement(key)),
        pick(unified, event) {
          variations.close(true);
          picker.pick(unified, event);
        },
        close: variations.close,
      };
    },
  };
  React.useLayoutEffect(() => {
    picker.list.current = handle;
    return () => {
      if (picker.list.current === handle) picker.list.current = null;
    };
  });
  React.useLayoutEffect(() => retain(sections, query), [sections]);
  const flushJump = () => {
    const jump = pendingJump.current;
    pendingJump.current = null;
    if (jump) handle.jump(jump.id, { instant: jump.instant });
  };

  // Set the focused key before React Aria sees DOM focus, or it treats focus as entering with no key and jumps to the first cell
  const onFocusCapture = (e: React.FocusEvent) => {
    const id = cellOf(e.target)?.getAttribute("data-key");
    const manager = state.selectionManager;
    if (id == null || e.target !== document.activeElement || manager.isFocused || manager.focusedKey === id) return;
    manager.setFocusedKey(id);
  };

  // Keys arrive from a focused cell, or forwarded by React Aria's Autocomplete from the search field
  const keys = usePickerKeyDown<HTMLElement>(onKeyDown, (e): KeyResult => {
    const target = cellOf(e.target);
    const cell = target && target === document.activeElement && listRef.current?.contains(target) ? target : null;
    if (e.altKey || e.metaKey) return false;
    if (e.key === " " && e.shiftKey) return Boolean(cell) && handle.variations(cell);
    if (e.key === "Enter" || (e.key === " " && cell)) {
      const key = cell?.getAttribute("data-key") ?? highlighted();
      return key != null && pick(key, e.nativeEvent);
    }
    const to = MOVES[e.key];
    if (!to || (e.ctrlKey && to !== "first" && to !== "last")) return false;
    return handle.move(to, { reason: "keyboard", event: e.nativeEvent }, cell);
  });

  useActiveDescendant(core, latest, cellElement, picker.target, picker.ownsFocus);
  const cellHandlers = usePointerHighlight({ picker, highlight, marks, listRef, virtual, keyed, openVariations: variations.open, cellElement, pick });
  const { isFocusVisible: focusVisible } = useFocusVisible();

  const selectable = React.useContext(SelectableCollectionContext) as { ref?: React.Ref<HTMLElement>; filter?: unknown } | null;
  const { ref: fieldRef, filter: _filter, ...collectionProps } = (virtual && selectable) || {};
  const merged = React.useMemo(() => mergeRefs(listRef, probeRoot, ref, fieldRef), [listRef, probeRoot, ref, fieldRef]);
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
      onAction: (key: Key) => void pick(key),
      onFocus(e: React.FocusEvent) {
        const cell = cellOf(e.target);
        if (!cell || e.target !== document.activeElement) return;
        const id = cell.getAttribute("data-key");
        lastFocused.current = id;
        marks.dispatch({ stop: id });
        setHighlight(id);
        core.setDomFocus(true);
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
  const { onKeyDown: collectionKeys, ...listBox } = listBoxProps;
  const listId = (listBoxProps.id as string | undefined) ?? picker.listId;
  latest.current.listId = listId;
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
        if (!at) return undefined;
        const line = at.row - grid.stickyIndexes.filter((r) => r < at.row).length;
        return orientation === "horizontal" ? [at.index + 1, at.section.items.length, index, at.column, line] : [at.index + 1, at.section.items.length, index, line, at.column];
      },
      virtual,
      elements,
      headers,
      picker: core,
      marks,
      target: picker.target,
      reveal: (id) => latest.current.geometry.reveal(id),
      sectionDomId: (id) => `${picker.listId}-section-${id}`,
      toggle: (id) => picker.state.toggleCollapsed(id, { reason: "trigger-press" }),
    }),
    [selection.selectedKeys, selection.selectionMode, listId, collectionId, focusVisible, virtual, core, marks, picker.target, picker.listId, picker.collapse, orientation],
  );

  return {
    state,
    collection,
    cells,
    persisted,
    applyHighlight,
    syncStop,
    flushJump,
    gridProps: {
      ...mergeProps(listBox, focusProps, cellHandlers, { onFocusCapture }),
      onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
        keys(e);
        if (!e.isPropagationStopped() && !(e.key in MOVES) && e.key !== "Enter" && e.key !== " ") collectionKeys?.(e);
      },
      ref: merged,
      tabIndex: fieldRef ? undefined : -1,
      "data-slot": SLOTS.list,
      "data-orientation": orientation,
      "data-empty": flag(collection.size === 0),
      "data-focused": flag(isFocused),
      "data-focus-visible": flag(isFocusVisible),
      "data-searching": flag(searching),
      "data-results": searching ? picker.searchResults : undefined,
      "aria-busy": (searching && pending) || undefined,
    } as React.HTMLAttributes<HTMLElement> & { ref: React.RefCallback<HTMLElement> },
    variations: picker.variations.custom ? null : <VariationsPopup />,
  };
}
