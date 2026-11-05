import * as React from "react";
import type { OverlayTriggerState } from "react-stately/useOverlayTriggerState";

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean) => void;
  close: (reason?: "select") => void;
  selected: React.RefObject<boolean>;
  closeOnSelect: boolean;
  focusGrid?: boolean;
  overlay: OverlayTriggerState;
};

export const PopoverContext = React.createContext<PopoverState | null>(null);

export type EmojiPopoverState = { readonly open: boolean; setOpen(open: boolean): void };

export const useEmojiPopover = (): EmojiPopoverState | null => React.useContext(PopoverContext);
