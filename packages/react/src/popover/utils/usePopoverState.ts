"use client";

import * as React from "react";
import { createChangeDetails } from "@emoji-components/core/internal";
import { useChangeState } from "../../utils/useChangeState";
import type { PopoverState } from "../root/EmojiPopoverRootContext";
import { interactionOf } from "./focus";
import type { EmojiPopoverInteractionType, EmojiPopoverRootChangeEventReason, EmojiPopoverRootProps } from "./types";

export function usePopoverState({ open: controlled, defaultOpen = false, onOpenChange, onOpenChangeComplete, actionsRef }: Omit<EmojiPopoverRootProps, "children" | "modal">, trigger: HTMLElement | null) {
  const [open, setState] = useChangeState(controlled, defaultOpen, onOpenChange);
  const interaction = React.useRef<EmojiPopoverInteractionType>("");
  const focusGrid = React.useRef(false);
  const setOpen = React.useCallback(
    (next: boolean, reason: EmojiPopoverRootChangeEventReason, event?: Event) => {
      interaction.current = interactionOf(event);
      setState(next, createChangeDetails(reason, event, trigger?.isConnected ? trigger : undefined));
    },
    [setState, trigger],
  );
  // After the task's microtasks, so an editor focused in onSelect (Lexical updates in a microtask) keeps focus
  const close = React.useCallback((reason: EmojiPopoverRootChangeEventReason = "none", event?: Event) => queueMicrotask(() => setOpen(false, reason, event)), [setOpen]);
  React.useImperativeHandle(actionsRef, () => ({ close: () => setOpen(false, "imperative-action") }), [setOpen]);
  return React.useMemo<PopoverState>(() => ({ open, setOpen, close, interaction, focusGrid, complete: onOpenChangeComplete }), [open, setOpen, close, onOpenChangeComplete]);
}
