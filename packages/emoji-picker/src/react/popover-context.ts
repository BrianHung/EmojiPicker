// The nearest EmojiPopover's state, apart from the popover itself: a picker reads it
// (close on pick) without pulling a popover library into apps that never open one.
import * as React from "react";

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: () => void;
  closeOnSelect: boolean;
  /** The content leaves initial focus to its picker: a grid that renders after opening focuses its current emoji. */
  focusGrid?: boolean;
};

export const PopoverContext = React.createContext<PopoverState | null>(null);
/** Open state of the nearest EmojiPopover, for custom triggers and contents. */
export const useEmojiPopover = () => React.useContext(PopoverContext);
