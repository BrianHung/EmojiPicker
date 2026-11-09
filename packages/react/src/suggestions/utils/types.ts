import type * as React from "react";
import type { ChangeDetails } from "@emoji-components/core";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import type { EmojiPopoverAnchor, EmojiPopoverPopupState, EmojiPopoverPortalProps, EmojiPopoverPositionerProps, EmojiPopoverPositionerState } from "../../popover/utils/types";

export type EmojiSuggestionsRootChangeEventReason = "outside-press" | "none";
export type EmojiSuggestionsRootChangeEventDetails = ChangeDetails<EmojiSuggestionsRootChangeEventReason>;

export type EmojiSuggestionsRootProps = {
  open: boolean;
  onOpenChange?: (open: boolean, details: EmojiSuggestionsRootChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  children: React.ReactNode;
};

export type EmojiSuggestionsPortalProps = EmojiPopoverPortalProps;

export type EmojiSuggestionsPositionerState = EmojiPopoverPositionerState;

export type EmojiSuggestionsPositionerProps = Omit<EmojiPopoverPositionerProps, "anchor"> & { anchor: EmojiPopoverAnchor };

export type EmojiSuggestionsPopupState = EmojiPopoverPopupState;

export type EmojiSuggestionsPopupProps = EmojiComponentsPartElementProps<EmojiSuggestionsPopupState>;
