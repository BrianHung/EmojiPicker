import type * as React from "react";
import type { ChangeDetails } from "@emoji-components/core";
import type { EmojiComponentsPartElementProps } from "../../internals/types";
import type { EmojiPopoverAlign, EmojiPopoverAnchor, EmojiPopoverContainer, EmojiPopoverPopupState, EmojiPopoverPortalProps, EmojiPopoverPositionerProps, EmojiPopoverPositionerState, EmojiPopoverSide } from "../../popover/utils/types";

export type EmojiSuggestionsSide = EmojiPopoverSide;
export type EmojiSuggestionsAlign = EmojiPopoverAlign;
export type EmojiSuggestionsAnchor = EmojiPopoverAnchor;
export type EmojiSuggestionsContainer = EmojiPopoverContainer;

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

export type EmojiSuggestionsPositionerProps = Omit<EmojiPopoverPositionerProps, "anchor"> & { anchor: EmojiSuggestionsAnchor };

export type EmojiSuggestionsPopupState = EmojiPopoverPopupState;

export type EmojiSuggestionsPopupProps = EmojiComponentsPartElementProps<EmojiSuggestionsPopupState>;
