"use client";

import type * as React from "react";
import { FloatingPortal } from "@floating-ui/react";
import { containerOf } from "../../utils/elements";
import type { EmojiPopoverContainer, TransitionStatus } from "../../utils/types";

export const portal = (status: TransitionStatus | null, container: EmojiPopoverContainer | undefined, children: React.ReactNode) => (status ? <FloatingPortal root={containerOf(container)}>{children}</FloatingPortal> : null);
