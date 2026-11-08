"use client";

import * as React from "react";
import type { EmojiPopoverPositionerState, TransitionStatus } from "../../utils/types";

export type Positioned = { state: EmojiPopoverPositionerState; status: TransitionStatus };

export const EmojiPopoverPositionerContext = React.createContext<Positioned | null>(null);

export function useEmojiPopoverPositionerContext(component: string) {
  const positioned = React.useContext(EmojiPopoverPositionerContext);
  if (!positioned) throw new Error(`${component}.Popup must be inside ${component}.Positioner`);
  return positioned;
}
