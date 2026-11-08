"use client";

import * as React from "react";
import type { FloatingContext } from "@floating-ui/react";
import type { EmojiPopoverPositionerState, TransitionStatus } from "../../utils/types";
import type { FloatingProps } from "../utils/usePlacement";

export type Positioned = { context: FloatingContext; state: EmojiPopoverPositionerState; status: TransitionStatus; floatingProps: FloatingProps };

export const EmojiPopoverPositionerContext = React.createContext<Positioned | null>(null);

export function useEmojiPopoverPositionerContext(component: string) {
  const positioned = React.useContext(EmojiPopoverPositionerContext);
  if (!positioned) throw new Error(`${component}.Popup must be inside ${component}.Positioner`);
  return positioned;
}
