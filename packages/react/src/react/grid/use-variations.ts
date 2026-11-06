import * as React from "react";
import type { Key } from "@react-types/shared";
import type { EmojiPicker } from "@brianhung/emoji-picker-core";
import type { CellElement } from "./types";

// The skin tone row a long press or Shift+Space opens; closing it can hand focus back
export function useVariations(core: EmojiPicker<React.ReactNode>, cellElement: CellElement, setHighlight: (key: Key | null) => void) {
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
