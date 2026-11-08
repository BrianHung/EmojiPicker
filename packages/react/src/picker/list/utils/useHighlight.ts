"use client";

import * as React from "react";
import type { Key } from "@react-types/shared";
import type { EmojiPicker, EmojiSection } from "@emoji-components/core";
import type { HighlightSource } from "../../root/EmojiPickerRootContext";
import { useLayoutEffect } from "../../../utils/useLayoutEffect";
import type { GridLatest } from "./types";

const NONE: HighlightSource = {};

// The highlight and the grid's keyboard position; the highlighted cell stays mounted off screen
export function useHighlight(core: EmojiPicker<React.ReactNode>, latest: { readonly current: GridLatest }, sections: readonly EmojiSection[], ownsFocus: (el: Element | null) => boolean) {
  const [persisted] = React.useState(() => new Set<Key>());
  const position = React.useRef<Key | null>(null);
  const pending = React.useRef<{ key: Key | null } | null>(null);
  const highlighted = (): string | null => core.getSnapshot().highlighted;
  const lastKey = () => highlighted() ?? position.current;
  const setHighlight = (key: Key | null, details = NONE) => {
    core.highlight(key == null ? null : String(key), details);
    persisted.clear();
    if (key == null) return;
    persisted.add(key);
    position.current = key;
  };
  // A key not in the collection yet waits for the render that adds it; without focus in the field, only the position moves
  const applyHighlight = () => {
    const next = pending.current;
    if (!next || (next.key != null && !latest.current.collection.getItem(next.key))) return;
    pending.current = null;
    if (next.key != null && !(latest.current.virtual && ownsFocus(document.activeElement))) position.current = next.key;
    else setHighlight(next.key);
  };
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per new set of sections; the rest is read when it runs
  useLayoutEffect(() => {
    const target = core.retainHighlight(sections, lastKey() == null ? null : String(lastKey()));
    if (!target) return;
    pending.current = target;
    applyHighlight();
  }, [core, sections]);
  return { persisted, highlighted, lastKey, setHighlight, applyHighlight };
}

export type Highlight = ReturnType<typeof useHighlight>;
