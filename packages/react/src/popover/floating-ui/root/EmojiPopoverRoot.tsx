"use client";

import * as React from "react";
import { FloatingNode, FloatingTree, useDismiss, useFloatingNodeId, useFloatingParentNodeId, useFloatingRootContext, useInteractions, useRole } from "@floating-ui/react";
import { PopoverProvider } from "../../root/EmojiPopoverRootContext";
import type { EmojiPopoverRootActions, EmojiPopoverRootChangeEventDetails, EmojiPopoverRootChangeEventReason, EmojiPopoverRootProps } from "../../utils/types";
import { usePopoverState } from "../../utils/usePopoverState";
import { useTransition } from "../../utils/useTransition";
import { reasonOf } from "../utils/usePlacement";
import type { FloatingInternals } from "./EmojiPopoverRootContext";

export function EmojiPopoverRoot(props: EmojiPopoverRootProps) {
  const node = <RootNode {...props} />;
  return useFloatingParentNodeId() === null ? <FloatingTree>{node}</FloatingTree> : node;
}

function RootNode({ children, modal = false, ...props }: EmojiPopoverRootProps) {
  const [trigger, setTrigger] = React.useState<HTMLElement | null>(null);
  const state = usePopoverState(props, trigger);
  const nodeId = useFloatingNodeId();
  const [floating, setFloating] = React.useState<HTMLElement | null>(null);
  const popup = React.useRef<HTMLElement | null>(null);
  const status = useTransition(state.open, popup, state.complete);
  const context = useFloatingRootContext({ open: state.open, onOpenChange: (open, event, reason) => state.setOpen(open, reasonOf(reason), event), elements: { reference: trigger, floating } });
  const { getReferenceProps, getFloatingProps } = useInteractions([useDismiss(context), useRole(context)]);
  const value: FloatingInternals = {
    state,
    trigger,
    setTrigger,
    triggerProps: (props) => getReferenceProps(props as React.HTMLProps<Element>),
    context,
    nodeId,
    modal,
    setFloating,
    floatingProps: getFloatingProps,
    status,
    popup,
  };
  return (
    <PopoverProvider value={value}>
      <FloatingNode id={nodeId}>{children}</FloatingNode>
    </PopoverProvider>
  );
}

export declare namespace EmojiPopoverRoot {
  type Props = EmojiPopoverRootProps;
  type Actions = EmojiPopoverRootActions;
  type ChangeEventReason = EmojiPopoverRootChangeEventReason;
  type ChangeEventDetails = EmojiPopoverRootChangeEventDetails;
}
