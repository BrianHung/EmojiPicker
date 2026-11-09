"use client";

import * as React from "react";
import { type EmojiPickerStore, isComposingKey } from "@emoji-components/core";
import { KEY_MOVES } from "@emoji-components/core/grid";
import { syncAriaAttributes } from "@emoji-components/core/internal";
import type { ListHandle } from "../EmojiPickerRootContext";
import { hasModifier } from "../../../internals/usePickerKeyDown";

// A combobox with its popup open accepts on Tab, as the typeahead's own menus do
const accepts = (el: HTMLElement) => el.getAttribute("aria-expanded") === "true";

// An editor the app renders drives the grid: its arrows move the highlight, Enter picks, and it carries the listbox's ARIA while mounted
function bind(el: HTMLElement, state: EmojiPickerStore<React.ReactNode>, list: React.RefObject<ListHandle | null>) {
  const unregister = state.registerInput();
  const onKeyDown = (event: KeyboardEvent) => {
    if (isComposingKey(event) || hasModifier(event)) return;
    const to = KEY_MOVES[event.key];
    const moves = to && to !== "first" && to !== "last";
    const handled = moves ? list.current?.move(to, { reason: "keyboard", event }) : !event.shiftKey && (event.key === "Enter" || (event.key === "Tab" && accepts(el))) && list.current?.pick(event);
    if (!handled) return;
    event.preventDefault();
    // The editor's own keydown listeners on this element would move the caret too
    event.stopImmediatePropagation();
  };
  el.addEventListener("keydown", onKeyDown, true);
  const unsync = syncAriaAttributes(
    el,
    () => {
      const ids = list.current?.ids();
      return ids ? { "aria-controls": ids.list, "aria-activedescendant": ids.active } : null;
    },
    state.subscribe,
  );
  return () => {
    el.removeEventListener("keydown", onKeyDown, true);
    unsync();
    unregister();
  };
}

// A ref can attach after Root mounts, so the target is read again after every commit and rebound when it changes
export function useKeyboardTarget(target: () => HTMLElement | null, state: EmojiPickerStore<React.ReactNode>, list: React.RefObject<ListHandle | null>) {
  const bound = React.useRef<{ el: HTMLElement | null; unbind?: () => void }>({ el: null });
  React.useEffect(() => {
    const el = target();
    if (el === bound.current.el) return;
    bound.current.unbind?.();
    bound.current = { el, unbind: el ? bind(el, state, list) : undefined };
  });
  React.useEffect(
    () => () => {
      bound.current.unbind?.();
      bound.current = { el: null };
    },
    [],
  );
}
