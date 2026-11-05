import * as React from "react";
import type { EmojiSelection } from "@brianhung/emoji-picker-core";
import { useFrequentEmoji } from "../provider/hooks";
import { PickerRoot, type RootProps } from "../root/picker";
import { Reactions } from "../reactions/reactions";
import { reactionKey } from "../reactions/reactions-context";

export type TapbackProps = Omit<RootProps, "children" | "onSelect"> & {
  onSelect: (selection: EmojiSelection) => void;
  count?: number;
  reactions?: readonly string[];
  collapseOnSelect?: boolean;
  expandable?: boolean;
  selected?: readonly string[];
  children?: React.ReactNode;
};

export const Tapback = React.forwardRef<HTMLElement, TapbackProps>(function Tapback({ onSelect, count = 5, reactions, collapseOnSelect = true, expandable = true, selected, children, ...root }, ref) {
  const top = useFrequentEmoji(count);
  const pressed = React.useMemo(() => (selected ? new Set(selected.map(reactionKey)) : null), [selected]);
  return (
    <PickerRoot
      ref={ref}
      {...root}
      reactions={reactions ?? top}
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
