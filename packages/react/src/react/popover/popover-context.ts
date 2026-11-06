import * as React from "react";
import type { ChangeDetails } from "@brianhung/emoji-picker-core";

export type EmojiPopoverRootChangeEventReason = "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "scroll" | "imperative-action" | "none";
export type EmojiPopoverRootChangeEventDetails = ChangeDetails<EmojiPopoverRootChangeEventReason>;

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean, reason: EmojiPopoverRootChangeEventReason, event?: Event) => void;
  close: (reason?: EmojiPopoverRootChangeEventReason, event?: Event) => void;
  selected: React.RefObject<boolean>;
  closeOnSelect: boolean;
  complete?: (open: boolean) => void;
  focusGrid?: boolean;
};

export const PopoverContext = React.createContext<PopoverState | null>(null);
