import * as React from "react";
import type { EmojiSelection } from "../core/store";
import { useFrequentEmoji } from "./hooks";
import { PickerRoot, type RootProps } from "./picker";
import { Reactions } from "./reactions";
import { reactionKey } from "./reactions-context";

export type TapbackProps = Omit<RootProps, "children" | "onSelect"> & {
  onSelect: (selection: EmojiSelection) => void;
  /** How many frequent emoji the compact row shows. Default 5. */
  count?: number;
  /** Fixed reactions (unified codes) instead of the user's top emoji (Instagram, Messenger). */
  reactions?: readonly string[];
  /** Return to the compact row after picking from the full picker. Default true. */
  collapseOnSelect?: boolean;
  /** Show the "+" that expands into the full picker (an `EmojiPicker.Panel` in `children`). Default true. */
  expandable?: boolean;
  /** The user's current reactions (unified codes): their buttons are toggles, pressed (any skin tone). */
  selected?: readonly string[];
  /** `EmojiPicker.Reactions`, and the full picker in an `EmojiPicker.Panel`. Default: the reactions alone. */
  children?: React.ReactNode;
};

/**
 * iOS-style tapback: the user's top emoji (iOS defaults until there's history) and
 * a "+" that expands into the full picker.
 */
export const Tapback = React.forwardRef<HTMLElement, TapbackProps>(function Tapback({ onSelect, count = 5, reactions, collapseOnSelect = true, expandable = true, selected, children, ...root }, ref) {
  const top = useFrequentEmoji(count);
  const pressed = React.useMemo(() => (selected ? new Set(selected.map(reactionKey)) : null), [selected]);
  return (
    <PickerRoot
      ref={ref}
      {...root}
      reactions={reactions ?? top}
      reactionsDefaultOpen
      allowExpandReactions={expandable && Boolean(children)}
      pressed={pressed}
      onSelect={(selection, { collapse }) => {
        onSelect(selection);
        if (collapseOnSelect) collapse?.();
      }}
    >
      {children ?? <Reactions />}
    </PickerRoot>
  );
});
