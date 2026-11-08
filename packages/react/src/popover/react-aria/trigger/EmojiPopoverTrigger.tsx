import type * as React from "react";
import { EmojiPopoverTrigger as Trigger } from "../../trigger/EmojiPopoverTrigger";
import type { EmojiPopoverTriggerProps, EmojiPopoverTriggerState } from "../../utils/types";

// Declared in each adapter, so each entry's declarations hold the part, not a shared chunk's private copy
export const EmojiPopoverTrigger: React.ForwardRefExoticComponent<EmojiPopoverTriggerProps & React.RefAttributes<HTMLButtonElement>> = Trigger;

export declare namespace EmojiPopoverTrigger {
  type Props = EmojiPopoverTriggerProps;
  type State = EmojiPopoverTriggerState;
}
