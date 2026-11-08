"use client";

import * as React from "react";
import type { Key } from "@react-types/shared";
import type { EmojiPickerRootContext } from "../../root/EmojiPickerRootContext";
import { SLOTS } from "../../../internals/slots";
import type { Highlight } from "./useHighlight";
import type { CellElement } from "./types";
import { cellOf, keyOf } from "../../list-cell/utils/useEmojiCell";

// Hover moves the keyboard position only on a real pointer move into another cell: a keyboard scroll slides cells under a resting pointer, and VoiceOver puts the pointer back on the cell it last read, behind focus
const pointer = { x: NaN, y: NaN, moved: false, list: null as Element | null, within: false, cell: null as Element | null, entered: false };
const LISTEN = { capture: true, passive: true };
let lists = 0;

function onPointerMove(e: PointerEvent) {
  const cell = cellOf(e.target);
  const list = cell?.closest(`[data-slot="${SLOTS.list}"]`) ?? null;
  pointer.entered = cell !== pointer.cell;
  pointer.cell = cell;
  pointer.moved = e.clientX !== pointer.x || e.clientY !== pointer.y;
  pointer.within = list !== null && list === pointer.list;
  pointer.list = list;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
}

function trackPointer() {
  if (lists++ === 0) addEventListener("pointermove", onPointerMove, LISTEN);
  return () => {
    if (--lists === 0) removeEventListener("pointermove", onPointerMove, LISTEN);
  };
}

const LONG_PRESS_MS = 500;
// A press that travels farther is a scroll, not a long press
const LONG_PRESS_SLOP_PX = 8;

type PointerOptions = {
  picker: EmojiPickerRootContext;
  highlight: Highlight;
  listRef: React.RefObject<HTMLElement | null>;
  virtual: boolean;
  keyed: React.MutableRefObject<boolean>;
  openVariations(key: Key | null): boolean;
  cellElement: CellElement;
  pick(key: Key): void;
};

export function usePointerHighlight({ picker: { state: core, ownsFocus }, highlight: { lastKey, setHighlight }, listRef, virtual, keyed, openVariations, cellElement, pick }: PointerOptions): React.HTMLAttributes<HTMLElement> {
  React.useEffect(trackPointer, []);
  const hover = (key: Key | null) => core.hover(key == null ? null : String(key));
  const follow = (key: Key, event: Event) => {
    if (!pointer.moved || !pointer.entered || lastKey() === key) return;
    const active = document.activeElement;
    const list = listRef.current;
    if (list?.contains(active) && active !== list) {
      if (keyed.current && !pointer.within) return;
      keyed.current = false;
      setHighlight(key, { reason: "pointer", event });
      core.setTabStop(String(key));
    } else if (virtual && ownsFocus(active)) setHighlight(key, { reason: "pointer", event });
  };
  // Not useLongPress: its press focuses the target and stops the click, and cells delegate from the list; it also has no move threshold
  const longPress = React.useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const endPress = () => {
    core.press(null);
    if (longPress.current) clearTimeout(longPress.current.timer);
  };
  return {
    onPointerDown(e) {
      const key = keyOf(e);
      if (key == null || e.button !== 0) return;
      endPress();
      core.press(key);
      longPress.current = { x: e.clientX, y: e.clientY, fired: false, timer: window.setTimeout(() => longPress.current && (longPress.current.fired = openVariations(key)), LONG_PRESS_MS) };
      e.preventDefault();
      if (e.pointerType === "touch") return;
      setHighlight(key, { reason: "pointer", event: e.nativeEvent });
      if (!virtual) cellElement(key)?.focus({ preventScroll: true });
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
      if (virtual && (e.nativeEvent as PointerEvent).pointerType === "touch") setHighlight(key, { reason: "pointer", event: e.nativeEvent });
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
      if (press && !press.fired && Math.hypot(e.clientX - press.x, e.clientY - press.y) > LONG_PRESS_SLOP_PX) endPress();
      const key = keyOf(e);
      if (key != null) follow(key, e.nativeEvent);
    },
  };
}
