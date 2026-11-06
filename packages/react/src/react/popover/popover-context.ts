import * as React from "react";
import type { ChangeDetails } from "@brianhung/emoji-picker-core";

export type EmojiPopoverRootChangeEventReason = "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "scroll" | "imperative-action" | "none";
export type EmojiPopoverRootChangeEventDetails = ChangeDetails<EmojiPopoverRootChangeEventReason>;

export type EmojiPopoverInteractionType = "mouse" | "touch" | "pen" | "keyboard" | "";

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean, reason: EmojiPopoverRootChangeEventReason, event?: Event) => void;
  close: (reason?: EmojiPopoverRootChangeEventReason, event?: Event) => void;
  selected: React.RefObject<boolean>;
  // How the last open or close was done, for initialFocus and finalFocus
  interaction: React.RefObject<EmojiPopoverInteractionType>;
  // Set when the content's initial focus falls to the default, which a picker inside takes as focusing its grid
  focusGrid: React.MutableRefObject<boolean>;
  closeOnSelect: boolean;
  complete?: (open: boolean) => void;
};

export const PopoverContext = React.createContext<PopoverState | null>(null);
