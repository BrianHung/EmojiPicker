"use client";

import * as React from "react";
import { useEmojiPickerRootContext } from "../../root/EmojiPickerRootContext";
import { shallowEqual, useStore } from "../../../utils/useStore";

// The sections the grid shows: results as they are (the engine hides what this system can't draw), and categories without those emoji (or a tone's duplicate)
export function useGridSections(horizontal: boolean) {
  const picker = useEmojiPickerRootContext("EmojiPicker.List");
  const { searching, categorySections, sections } = useStore(picker.state, ({ searching, categorySections, sections }) => ({ searching, categorySections, sections }), shallowEqual);
  const { drawable, request } = picker.native;
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
  return { sections: searching ? sections : categories, request };
}
