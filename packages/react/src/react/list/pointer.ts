import * as React from "react";
import type { Key } from "@react-types/shared";
import type { PickerState } from "@brianhung/emoji-picker-core";
import type { HighlightSource } from "../root/context";
import { SLOTS } from "../utils/slots";
import { cellOf, keyOf, type MarksStore } from "./cell";

// Hover moves the keyboard position only on a real pointer move: a keyboard scroll slides cells under a resting pointer
const pointer = { x: NaN, y: NaN, moved: false, list: null as Element | null, within: false };
const LISTEN = { capture: true, passive: true };
let lists = 0;

function onPointerMove(e: PointerEvent) {
  const list = cellOf(e.target)?.closest(`[data-slot="${SLOTS.list}"]`) ?? null;
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

type PointerOptions = {
  core: PickerState<React.ReactNode>;
  marks: MarksStore;
  listRef: React.RefObject<HTMLElement | null>;
  virtual: boolean;
  keyed: React.MutableRefObject<boolean>;
  lastKey(): Key | null;
  setHighlight(key: Key | null, details?: HighlightSource): void;
  ownsFocus(el: Element | null): boolean;
  openVariations(key: Key | null): boolean;
  focusCell(key: Key): void;
  pick(key: Key): void;
};

export function usePointerHighlight({ core, marks, listRef, virtual, keyed, lastKey, setHighlight, ownsFocus, openVariations, focusCell, pick }: PointerOptions): React.HTMLAttributes<HTMLElement> {
  React.useEffect(trackPointer, []);
  const hover = (key: Key | null) => core.hover(key == null ? null : String(key));
  const follow = (key: Key, event: Event) => {
    if (!pointer.moved || lastKey() === key) return;
    const active = document.activeElement;
    const list = listRef.current;
    if (list?.contains(active) && active !== list) {
      if (keyed.current && !pointer.within) return;
      keyed.current = false;
      setHighlight(key, { reason: "pointer", event });
      marks.dispatch({ stop: key });
    } else if (virtual && ownsFocus(active)) setHighlight(key, { reason: "pointer", event });
  };
  // Not useLongPress: its press focuses the target and stops the click, and cells delegate from the list; it also has no move threshold
  const longPress = React.useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const endPress = () => {
    marks.dispatch({ pressed: null });
    if (longPress.current) clearTimeout(longPress.current.timer);
  };
  return {
    onPointerDown(e) {
      const key = keyOf(e);
      if (key == null || e.button !== 0) return;
      endPress();
      marks.dispatch({ pressed: key });
      longPress.current = { x: e.clientX, y: e.clientY, fired: false, timer: window.setTimeout(() => longPress.current && (longPress.current.fired = openVariations(key)), LONG_PRESS_MS) };
      e.preventDefault();
      if (e.pointerType === "touch") return;
      setHighlight(key, { reason: "pointer", event: e.nativeEvent });
      if (!virtual) focusCell(key);
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
      if (press && !press.fired && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) endPress();
      const key = keyOf(e);
      if (key != null) follow(key, e.nativeEvent);
    },
  };
}
