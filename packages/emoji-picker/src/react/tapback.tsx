import * as React from "react";
import type { EmojiSelection } from "../core/store";
import { useFrequentEmoji } from "./hooks";
import { Panel, PickerRoot, Reactions, type RootProps } from "./picker";

export type TapbackProps = Omit<RootProps, "children" | "onSelect"> & {
  onSelect: (selection: EmojiSelection) => void;
  /** How many frequent emoji the compact row shows. Default 5. */
  count?: number;
  /** Return to the compact row after picking from the full picker. Default true. */
  collapseOnSelect?: boolean;
  /** Show the "+" that expands into the full picker. Default true. */
  expandable?: boolean;
  reactionsClassName?: string;
  /** Contents of the expanded picker: EmojiPicker.Search, .Viewport, .List, ... */
  children?: React.ReactNode;
};

/**
 * iOS-style tapback: the user's top emoji (iOS defaults until there's
 * history) and a "+" that expands into the full picker.
 */
export const Tapback = React.forwardRef<HTMLElement, TapbackProps>(function Tapback(
  { onSelect, count = 5, collapseOnSelect = true, expandable = true, reactionsClassName, children, ...root },
  ref,
) {
  const top = useFrequentEmoji(count);
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
      <Reactions className={reactionsClassName} />
      {expandable && children ? <Panel>{children}</Panel> : null}
    </PickerRoot>
  );
});
