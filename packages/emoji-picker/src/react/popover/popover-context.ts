// Kept apart from the popover so a picker can read it without pulling a popover library in
import * as React from "react";

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: (reason?: "select") => void;
  selected: React.RefObject<boolean>;
  closeOnSelect: boolean;
  focusGrid?: boolean;
};

export const PopoverContext = React.createContext<PopoverState | null>(null);

export type EmojiPopoverState = { readonly open: boolean; setOpen(open: boolean): void };

export const useEmojiPopover = (): EmojiPopoverState | null => React.useContext(PopoverContext);
