"use client";

import type * as React from "react";
import { mergePartProps } from "../../../internals/mergePartProps";
import { inert, renderElement, resolve } from "../../../internals/renderElement";
import type { EmojiComponentsPartElementProps } from "../../../internals/types";
import { EmojiPopoverPositionerContext } from "../positioner/EmojiPopoverPositionerContext";
import { closedPointerEvents, positionerAttributes } from "../../utils/popupAttributes";
import type { EmojiPopoverPositionerState, TransitionStatus } from "../../utils/types";
import type { FloatingProps, PlacementResult } from "./usePlacement";

export function positioned(
  { context, state, style }: PlacementResult,
  status: TransitionStatus,
  floatingProps: FloatingProps,
  slot: string,
  { className, style: own, render, children, ...props }: EmojiComponentsPartElementProps<EmojiPopoverPositionerState>,
  ref: React.Ref<HTMLDivElement>,
) {
  return (
    <EmojiPopoverPositionerContext.Provider value={{ context, state, status, floatingProps }}>
      {renderElement(
        "div",
        {
          ...mergePartProps(props),
          ...positionerAttributes(state, slot),
          inert: inert(!state.open),
          ref,
          className,
          style: (s: EmojiPopoverPositionerState) => ({ ...style, ...closedPointerEvents(state.open), ...resolve(own, s) }),
          render,
          children,
        },
        state,
      )}
    </EmojiPopoverPositionerContext.Provider>
  );
}
