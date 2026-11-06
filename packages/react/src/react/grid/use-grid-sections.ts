import * as React from "react";
import { useDrawable } from "../emoji/native-support";
import { usePicker } from "../root/context";
import { shallowEqual, useStore } from "../utils/store";

// The sections the grid shows: results as they are, and categories without emoji this system can't draw (or a tone's duplicate)
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
