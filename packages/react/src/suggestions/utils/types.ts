import type * as React from "react";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import type { EmojiPopoverAnchor, EmojiPopoverPopupState, EmojiPopoverPortalProps, EmojiPopoverPositionerProps, EmojiPopoverPositionerState, EmojiPopoverRootChangeEventDetails } from "../../popover/utils/types";

export type EmojiSuggestionsRootProps = {
  open: boolean;
  onOpenChange?: (open: boolean, details: EmojiPopoverRootChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  children: React.ReactNode;
};

export type EmojiSuggestionsPortalProps = EmojiPopoverPortalProps;

export type EmojiSuggestionsPositionerState = EmojiPopoverPositionerState;

export type EmojiSuggestionsPositionerProps = Omit<EmojiPopoverPositionerProps, "anchor"> & { anchor: EmojiPopoverAnchor };

export type EmojiSuggestionsPopupState = EmojiPopoverPopupState;

export type EmojiSuggestionsPopupProps = EmojiComponentsPartElementProps<EmojiSuggestionsPopupState>;
