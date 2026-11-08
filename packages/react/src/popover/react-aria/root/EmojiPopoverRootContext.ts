import type * as React from "react";
import type { PopoverInternals } from "../../root/EmojiPopoverRootContext";
import type { EmojiPopoverFinalFocus } from "../../utils/types";

export type AriaInternals = PopoverInternals & { id?: string; modal: boolean; finalFocus: React.MutableRefObject<EmojiPopoverFinalFocus | undefined> };
