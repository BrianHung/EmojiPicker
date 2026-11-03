import * as React from "react";
import type { EmojiSelection } from "../core/store";
import { useFrequentEmoji } from "./hooks";
import { Panel, PickerRoot, Reactions, type RootProps } from "./picker";
import { SelectedReactionsContext, reactionKey } from "./reactions";

export type TapbackProps = Omit<RootProps, "children" | "onSelect"> & {
  onSelect: (selection: EmojiSelection) => void;
  /** How many frequent emoji the compact row shows. Default 5. */
  count?: number;
  /** Return to the compact row after picking from the full picker. Default true. */
  collapseOnSelect?: boolean;
  /** Show the "+" that expands into the full picker. Default true. */
  expandable?: boolean;
  reactionsClassName?: string;
  /** The user's current reactions (unified codes): their buttons get aria-pressed and data-selected. */
  selected?: readonly string[];
  /** Contents of the expanded picker: EmojiPicker.Search, .Viewport, .List, ... */
  children?: React.ReactNode;
};

/**
 * iOS-style tapback: the user's top emoji (iOS defaults until there's
 * history) and a "+" that expands into the full picker.
 */
export const Tapback = React.forwardRef<HTMLElement, TapbackProps>(function Tapback(
  { onSelect, count = 5, collapseOnSelect = true, expandable = true, reactionsClassName, selected, children, ...root },
  ref,
) {
  const top = useFrequentEmoji(count);
  // Compared without skin tones, so a reaction in any tone counts.
  const pressed = React.useMemo(() => (selected ? new Set(selected.map(reactionKey)) : null), [selected]);
  return (
    <PickerRoot
      ref={ref}
      {...root}
      reactions={top}
      reactionsDefaultOpen
      allowExpandReactions={expandable}
      onSelect={(selection, { collapse }) => {
        onSelect(selection);
        if (collapseOnSelect) collapse?.();
      }}
    >
      <SelectedReactionsContext.Provider value={pressed}>
        <Reactions className={reactionsClassName} />
      </SelectedReactionsContext.Provider>
      {expandable && children ? <Panel>{children}</Panel> : null}
    </PickerRoot>
  );
});
