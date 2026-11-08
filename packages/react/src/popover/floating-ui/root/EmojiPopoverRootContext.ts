import type * as React from "react";
import type { FloatingRootContext } from "@floating-ui/react";
import type { PopoverInternals } from "../../root/EmojiPopoverRootContext";
import type { TransitionStatus } from "../../utils/types";
import type { FloatingProps } from "../utils/usePlacement";

export type Mount = { status: TransitionStatus | null; popup: React.RefObject<HTMLElement | null> };

export type FloatingInternals = PopoverInternals &
  Mount & {
    context: FloatingRootContext;
    nodeId?: string;
    modal: boolean;
    setFloating: (el: HTMLElement | null) => void;
    floatingProps: FloatingProps;
  };
