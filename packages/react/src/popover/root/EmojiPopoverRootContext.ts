"use client";

import * as React from "react";
import type { EmojiPopoverInteractionType, EmojiPopoverRootChangeEventReason } from "../utils/types";

export type PopoverState = {
  open: boolean;
  setOpen: (open: boolean, reason: EmojiPopoverRootChangeEventReason, event?: Event) => void;
  close: (reason?: EmojiPopoverRootChangeEventReason, event?: Event) => void;
  // How the last open or close was done, for initialFocus and finalFocus
  interaction: React.RefObject<EmojiPopoverInteractionType>;
  // Set when the content's initial focus falls to the default, which a picker inside takes as focusing its grid
  focusGrid: React.MutableRefObject<boolean>;
  complete?: (open: boolean) => void;
};

// What a picker inside reads, whichever positioning library renders the popover
export const PopoverContext = React.createContext<PopoverState | null>(null);

export type PopoverInternals = {
  state: PopoverState;
  trigger: HTMLElement | null;
  setTrigger: (el: HTMLElement | null) => void;
  triggerProps: (props: object) => Record<string, unknown>;
};

export const EmojiPopoverRootContext = React.createContext<PopoverInternals | null>(null);

export function useEmojiPopoverRootContext<T extends PopoverInternals>(part: string): T {
  const internals = React.useContext(EmojiPopoverRootContext);
  if (!internals) throw new Error(`EmojiPopover.${part} must be inside EmojiPopover.Root`);
  return internals as T;
}

export function PopoverProvider({ value, children }: { value: PopoverInternals; children: React.ReactNode }) {
  return React.createElement(PopoverContext.Provider, { value: value.state }, React.createElement(EmojiPopoverRootContext.Provider, { value }, children));
}
