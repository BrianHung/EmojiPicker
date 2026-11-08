"use client";

import * as React from "react";
import type { Key } from "@react-types/shared";
import type { EmojiPicker } from "@brianhung/emoji-picker-core";
import { PopoverContext } from "../../../popover/root/EmojiPopoverRootContext";
import { SLOTS } from "../../../internals/slots";
import type { CellElement, GridLatest } from "./types";

// One cell is the list's tab stop; a popover whose initial focus falls to the default also gets focus there on open
export function useFocusStop(core: EmojiPicker<React.ReactNode>, listRef: React.RefObject<HTMLElement | null>, latest: { readonly current: GridLatest }, cellElement: CellElement) {
  const focusGrid = React.useContext(PopoverContext)?.focusGrid;
  const lastFocused = React.useRef<Key | null>(null);
  const syncStop = () => {
    const list = listRef.current;
    if (list?.contains(document.activeElement) && document.activeElement !== list) {
      if (focusGrid) focusGrid.current = false;
      return;
    }
    const { collection, geometry } = latest.current;
    const stop = core.getSnapshot().tabStop;
    if (stop == null || !geometry.isVisible(stop) || !collection.emoji(stop)) {
      const last = lastFocused.current;
      const next = last != null && collection.emoji(last) && geometry.isVisible(last) ? last : geometry.firstVisible();
      core.setTabStop(next == null ? null : String(next));
    }
    const cell = focusGrid?.current ? cellElement(core.getSnapshot().tabStop) : null;
    if (!cell || !focusGrid) return;
    focusGrid.current = false;
    // On mount this runs before the root's ref attaches and maybe before the search field mounts, so it asks the DOM
    const root = cell.closest(`[data-slot="${SLOTS.root}"]`);
    if (root && !root.contains(document.activeElement) && !root.querySelector("[data-autofocus]")) cell.focus({ preventScroll: true });
  };
  return { lastFocused, syncStop };
}
