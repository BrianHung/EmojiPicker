import type * as React from "react";
import type { ChangeDetails } from "@brianhung/emoji-picker-core";
import type { EmojiPickerInteractionState, EmojiPickerPartElementProps } from "../../internals/types";

export type EmojiPopoverSide = "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end";
export type EmojiPopoverAlign = "start" | "center" | "end";

export type PopoverAnchorRect = { top: number; left: number; width: number; height: number };
export type VirtualAnchor = { getBoundingClientRect(): PopoverAnchorRect };
export type EmojiPopoverAnchor = Element | VirtualAnchor | React.RefObject<Element | null> | (() => Element | VirtualAnchor | PopoverAnchorRect | null | undefined) | null;

export type EmojiPopoverRootChangeEventReason = "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "scroll" | "imperative-action" | "none";
export type EmojiPopoverRootChangeEventDetails = ChangeDetails<EmojiPopoverRootChangeEventReason>;

export type EmojiPopoverInteractionType = "mouse" | "touch" | "pen" | "keyboard" | "";

export type EmojiPopoverRootActions = { close(): void };

export type EmojiPopoverRootProps = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: EmojiPopoverRootChangeEventDetails) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  actionsRef?: React.Ref<EmojiPopoverRootActions>;
  modal?: boolean;
  children: React.ReactNode;
};

export type EmojiPopoverTriggerState = EmojiPickerInteractionState & { open: boolean };

export type EmojiPopoverTriggerProps = EmojiPickerPartElementProps<EmojiPopoverTriggerState, HTMLButtonElement> & Pick<React.ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "name" | "value">;

export type EmojiPopoverInitialFocus = boolean | React.RefObject<HTMLElement | null> | ((openType: EmojiPopoverInteractionType) => HTMLElement | boolean | null | undefined);
export type EmojiPopoverFinalFocus = boolean | React.RefObject<HTMLElement | null> | ((closeType: EmojiPopoverInteractionType) => HTMLElement | boolean | null | undefined);
export type EmojiPopoverContainer = HTMLElement | ShadowRoot | React.RefObject<HTMLElement | ShadowRoot | null> | null;

export type EmojiPopoverPortalProps = {
  container?: EmojiPopoverContainer;
  children?: React.ReactNode;
};

export type EmojiPopoverPositionerState = { open: boolean; side: EmojiPopoverSide; align: EmojiPopoverAlign };

export type EmojiPopoverPositionerProps = EmojiPickerPartElementProps<EmojiPopoverPositionerState> & {
  side?: EmojiPopoverSide;
  align?: EmojiPopoverAlign;
  sideOffset?: number;
  alignOffset?: number;
  collisionPadding?: number;
  anchor?: EmojiPopoverAnchor;
};

export type Placement = Required<Pick<EmojiPopoverPositionerProps, "side" | "align" | "sideOffset" | "alignOffset" | "collisionPadding">>;

export type EmojiPopoverPopupState = EmojiPopoverPositionerState & { transitionStatus: "starting" | "ending" | "idle" | undefined };

export type EmojiPopoverPopupProps = EmojiPickerPartElementProps<EmojiPopoverPopupState> & {
  initialFocus?: EmojiPopoverInitialFocus;
  finalFocus?: EmojiPopoverFinalFocus;
};

export type TransitionStatus = NonNullable<EmojiPopoverPopupState["transitionStatus"]>;

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

export type EmojiSuggestionsPopupProps = EmojiPickerPartElementProps<EmojiSuggestionsPopupState>;
