// The nearest EmojiPopover's state, apart from the popover itself: a picker reads it
// (close on pick) without pulling a popover library into apps that never open one.
import * as React from "react";

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** `select`: a pick closes it (focus then goes to the content's `finalFocus`). */
  close: (reason?: "select") => void;
  /** The last close was a pick. */
  selected: React.RefObject<boolean>;
  closeOnSelect: boolean;
  /** The content leaves initial focus to its picker: a grid that renders after opening focuses its current emoji. */
  focusGrid?: boolean;
};

export const PopoverContext = React.createContext<PopoverState | null>(null);

export type EmojiPopoverState = { readonly open: boolean; setOpen(open: boolean): void };

/** Open state of the nearest EmojiPopover, for custom triggers and contents. */
export const useEmojiPopover = (): EmojiPopoverState | null => React.useContext(PopoverContext);
