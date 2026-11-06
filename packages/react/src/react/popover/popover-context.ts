import * as React from "react";
import type { ChangeDetails } from "@brianhung/emoji-picker-core";

export type PopoverOpenChangeDetails = ChangeDetails<"trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "scroll" | "imperative-action" | "none">;
export type PopoverOpenChangeReason = PopoverOpenChangeDetails["reason"];

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean, reason: PopoverOpenChangeReason, event?: Event) => void;
  close: (reason?: PopoverOpenChangeReason, event?: Event) => void;
  selected: React.RefObject<boolean>;
  closeOnSelect: boolean;
  complete(open: boolean): void;
  focusGrid?: boolean;
};

export const PopoverContext = React.createContext<PopoverState | null>(null);
