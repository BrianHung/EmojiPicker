import * as React from "react";
import type { EmojiPicker } from "@brianhung/emoji-picker-core";
import { AutocompleteStateContext } from "react-aria-components/Autocomplete";
import { useLatest } from "../utils/latest";
import { moveVirtualFocus, useLayoutEffect } from "../utils/utils";
import type { EmojiCollection } from "../list/collection";
import type { CellElement, GridLatest } from "./types";

// The search field's aria-activedescendant is React Aria's focused node, which follows virtual focus events: re-send them for the highlight, and clear one that left the collection
export function useActiveDescendant(
  core: EmojiPicker<React.ReactNode>,
  latest: { readonly current: GridLatest },
  collection: EmojiCollection,
  virtual: boolean,
  cellElement: CellElement,
  target: () => Element | null,
  ownsFocus: (el: Element | null) => boolean,
) {
  const field = React.useContext(AutocompleteStateContext);
  const autocomplete = useLatest(field);
  const cells = useLatest(cellElement);
  const sync = React.useCallback(() => {
    const state = autocomplete.current;
    const key = core.getSnapshot().highlighted;
    const valid = latest.current.virtual && key != null && latest.current.collection.emoji(key);
    const cell = valid ? cells.current(key) : null;
    // Only while the field or keyboard target has focus: React Aria pulls focus back to the field on a virtual focus event
    if (cell && ownsFocus(document.activeElement)) moveVirtualFocus(cell, target());
    // React Aria delays a new id while typing; until then the field must not point at a removed option
    const stale = state?.focusedNodeId != null && !document.getElementById(state.focusedNodeId);
    if (state && (stale || (!valid && state.focusedNodeId != null))) state.setFocusedNodeId(null);
  }, [core, latest, cells, autocomplete, target, ownsFocus]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: sync reads these through refs; each one changing is what makes it run again
  useLayoutEffect(sync, [sync, collection, virtual, field?.focusedNodeId]);
  React.useEffect(() => core.subscribe(() => queueMicrotask(sync)), [core, sync]);
}
