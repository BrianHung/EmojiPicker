// What Root shares with a Tapback's reaction row (kept apart so a plain picker doesn't load the row).
import * as React from "react";
import { withoutTone } from "../../core/dataset";

export type ReactionsState = {
  reactions: readonly string[];
  /** The compact row shows (false: the full picker). */
  open: boolean;
  /** Opens the full picker; undefined when the row can't expand. */
  expand?: () => void;
  /** The user's current reactions (base codes): their buttons are toggles, pressed. */
  pressed: ReadonlySet<string> | null;
};
export const ReactionsContext = React.createContext<ReactionsState | null>(null);

/** A code without skin-tone modifiers, lowercased: how reactions are compared. */
export const reactionKey = (unified: string) => withoutTone(unified.toLowerCase());

/** Whether a reaction button's emoji is one of the user's, in any skin tone. */
export const isPressed = (selected: ReadonlySet<string>, unified: string) => selected.has(reactionKey(unified));
