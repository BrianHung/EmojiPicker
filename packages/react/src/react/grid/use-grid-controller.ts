"use client";

import * as React from "react";
import type { Key } from "@react-types/shared";
import { useFocusRing } from "react-aria/useFocusRing";
import { useFocusVisible } from "react-aria/useFocusVisible";
import { useLocale } from "react-aria/I18nProvider";
import { useListBox } from "react-aria/useListBox";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import { useListState } from "react-stately/useListState";
import { AutocompleteStateContext, SelectableCollectionContext } from "react-aria-components/Autocomplete";
import { useSlottedContext } from "react-aria-components/slots";
import { withoutTone, type EmojiSection } from "@brianhung/emoji-picker-core";
import { flipForRtl, KEY_MOVES } from "@brianhung/emoji-picker-core/grid";
import { EmojiCollection } from "../list/collection";
import { cellOf, type Cells } from "../list/use-cell";
import { usePointerHighlight } from "../list/pointer";
import { VariationsPopup } from "../list/variations";
import { usePicker, type HighlightSource, type ListHandle, type Overlay, type EmojiPickerRootChangeEventReason } from "../root/context";
import { usePickerKeyDown, type KeyResult } from "../utils/keyboard";
import { useLatest } from "../utils/latest";
import { flag, type EmojiPickerOrientation } from "../utils/render";
import { SLOTS } from "../utils/slots";
import { shallowEqual, useStore } from "../utils/store";
import { useLayoutEffect } from "../utils/utils";
import type { CellElement, GridGeometry, GridLatest, Rendered } from "./types";
import { useActiveDescendant } from "./use-active-descendant";
import { useFocusStop } from "./use-focus-stop";
import { useHighlight } from "./use-highlight";
import { useVariations } from "./use-variations";

const NONE: HighlightSource = {};
const NO_KEYS: Key[] = [];

interface ControllerOptions {
  "aria-label"?: string;
  "aria-labelledby"?: string;
  sections: readonly EmojiSection[];
  geometry: GridGeometry;
  orientation: EmojiPickerOrientation;
  listRef: React.RefObject<HTMLElement | null>;
  ref?: React.Ref<HTMLElement>;
  probeRoot?: React.Ref<HTMLElement>;
  request(unifieds: Iterable<string>): void;
}

type GridElementProps = React.HTMLAttributes<HTMLElement> & { ref: React.RefCallback<HTMLElement>; [data: `data-${string}`]: string | undefined };

// The grid's behavior for both the List and useEmojiGrid: the highlight, keys, pointer, virtual focus, and React Aria's listbox
export function useGridController({ sections, geometry, orientation, listRef, ref, probeRoot, request, ...aria }: ControllerOptions) {
  const picker = usePicker("EmojiPicker.List");
  const { labels, value, state: core } = picker;
  const { searching, virtual, pending } = useStore(core, (s) => ({ searching: s.searching, virtual: s.focus === "virtual", pending: s.pending }), shallowEqual);
  const { navigation } = geometry;
  const collection = React.useMemo(() => new EmojiCollection(sections), [sections]);
  const selected = React.useMemo(() => (value == null ? undefined : sections.flatMap((s) => s.items.filter((i) => withoutTone(i.unified) === withoutTone(value)).map((i) => i.id))), [value, sections]);
  const state = useListState<unknown>({ collection, selectionMode: value === undefined ? "none" : "single", selectedKeys: selected ?? NO_KEYS, disallowEmptySelection: value !== undefined, layoutDelegate: geometry.layoutDelegate });
  const autocomplete = React.useContext(AutocompleteStateContext);
  const [elements] = React.useState(() => new Map<Key, HTMLElement>());
  const [headers] = React.useState(() => new Set<HTMLElement>());
  const cellElement: CellElement = React.useCallback((key) => (key == null ? null : (elements.get(key) ?? null)), [elements]);
  // After a key move, hover takes over only once the pointer moves: VoiceOver moves the pointer to what it reads, lagging focus
  const keyed = React.useRef(false);
  const rtl = useLocale().direction === "rtl";
  const latest = useLatest<GridLatest>({ collection, virtual, geometry, searching, rtl });

  const highlight = useHighlight(core, latest, sections, picker.ownsFocus);
  const { persisted, highlighted, lastKey, setHighlight, applyHighlight } = highlight;
  const { lastFocused, syncStop } = useFocusStop(core, listRef, latest, cellElement);
  const variations = useVariations(core, cellElement, setHighlight);
  const setStop = (key: Key | null) => core.setTabStop(key == null ? null : String(key));

  const moveTo = (key: Key, dom: boolean, details = NONE, from?: Key) => {
    geometry.reveal(key, from);
    setHighlight(key, details);
    if (dom) setStop(key);
  };
  const pick = (key: Key, event?: Event, reason?: EmojiPickerRootChangeEventReason) => {
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
      const move = flipForRtl(to, latest.current.rtl);
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
      const list = listIdRef.current;
      return { list, active: key != null && latest.current.collection.emoji(key) ? `${list}-option-${key}` : undefined };
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
      const all = latest.current.collection.sections();
      const section = all.find((s) => s.id === id) ?? all.find((s) => s.category === id);
      if (!section || !geometry.jump(section.id, instant)) return;
      core.setActiveSection(section.id);
      const first = section.items[0]?.id;
      if (first != null) setStop(first);
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
      if (!item || key == null) return null;
      return {
        record: item.record,
        style: latest.current.geometry.overlay(key, cellElement(key)),
        pick(unified, event) {
          variations.close(true);
          picker.pick(unified, event);
        },
        close: variations.close,
      };
    },
  };
  const { list } = picker;
  // The Root and its parts reach the grid through this ref, current as of the last commit: a ref write after every render, as useLatest does
  useLayoutEffect(() => {
    list.current = handle;
    return () => {
      if (list.current === handle) list.current = null;
    };
  });

  // After each render the cells on screen settle the highlight, the tab stop, the active section, and a pending jump
  const afterRender = ({ unifieds, section, settled }: Rendered) => {
    applyHighlight();
    request(unifieds);
    if (settled) {
      if (section !== undefined && !latest.current.searching) core.setActiveSection(section);
      syncStop();
    }
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
  const keys = usePickerKeyDown<HTMLElement>(undefined, (e): KeyResult => {
    const target = cellOf(e.target);
    const cell = target && target === document.activeElement && listRef.current?.contains(target) ? target : null;
    if (e.altKey || e.metaKey) return false;
    if (e.key === " " && e.shiftKey) return Boolean(cell) && handle.variations(cell);
    if (e.key === "Enter" || (e.key === " " && cell)) {
      const key = cell?.getAttribute("data-key") ?? highlighted();
      return key != null && pick(key, e.nativeEvent);
    }
    const to = KEY_MOVES[e.key];
    if (!to || (e.ctrlKey && to !== "first" && to !== "last")) return false;
    return handle.move(to, { reason: "keyboard", event: e.nativeEvent }, cell);
  });

  useActiveDescendant(core, latest, collection, virtual, cellElement, picker.target, picker.ownsFocus);
  const cellHandlers = usePointerHighlight({ picker, highlight, listRef, virtual, keyed, openVariations: variations.open, cellElement, pick });
  const { isFocusVisible: focusVisible } = useFocusVisible();

  const selectable = useSlottedContext(SelectableCollectionContext);
  const { ref: fieldRef, filter: _filter, ...collectionProps } = (virtual && selectable) || {};
  const merged = React.useMemo((): React.RefCallback<HTMLElement> => {
    const refs = mergeRefs(listRef, probeRoot, ref, fieldRef);
    return (el) => (typeof refs === "function" ? refs(el) : undefined);
  }, [listRef, probeRoot, ref, fieldRef]);
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
        setStop(id);
        setHighlight(id);
        core.setDomFocus(true);
      },
      onBlur(e: React.FocusEvent) {
        if (!e.nativeEvent.isTrusted || (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget))) return;
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
  const listId = typeof listBoxProps.id === "string" ? listBoxProps.id : picker.listId;
  const listIdRef = useLatest(listId);
  const { "data-collection": collectionId } = listBoxProps as { "data-collection"?: string };
  const selection = state.selectionManager;
  const { selectionMode, selectedKeys } = selection;
  // biome-ignore lint/correctness/useExhaustiveDependencies: React Aria's selection manager is a new object over the same state each render; its mode and keys are what change
  const cells = React.useMemo<Cells>(
    () => ({
      selection,
      listId,
      collectionId,
      focusVisible,
      position(id) {
        const grid = geometry.grid();
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
      target: picker.target,
      reveal: (id) => latest.current.geometry.reveal(id),
      sectionDomId: (id) => `${picker.listId}-section-${id}`,
      toggle: (id) => core.toggleCollapsed(id, { reason: "trigger-press" }),
    }),
    [selectionMode, selectedKeys, listId, collectionId, focusVisible, geometry, orientation, virtual, elements, headers, core, picker.target, picker.listId, latest],
  );

  const gridProps: GridElementProps = {
    ...mergeProps(listBox, focusProps, cellHandlers, { onFocusCapture }),
    onKeyDown(e: React.KeyboardEvent<HTMLElement>) {
      keys(e);
      if (!e.isPropagationStopped() && !(e.key in KEY_MOVES) && e.key !== "Enter" && e.key !== " ") collectionKeys?.(e);
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
  };
  return { state, collection, cells, persisted, afterRender, gridProps, variations: picker.variations.custom ? null : React.createElement(VariationsPopup) };
}

export type GridController = ReturnType<typeof useGridController>;
