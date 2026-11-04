// The nearest EmojiPopover's state, apart from the popover itself: a picker reads it
// (close on pick) without pulling Floating UI into apps that never open a popover.
import * as React from "react";

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
  closeOnSelect: boolean;
  triggerRef: React.MutableRefObject<HTMLElement | null>;
  contentId: string;
};

export const PopoverContext = React.createContext<PopoverState | null>(null);
/** Open state of the nearest EmojiPopover, for custom triggers and contents. */
export const useEmojiPopover = () => React.useContext(PopoverContext);
