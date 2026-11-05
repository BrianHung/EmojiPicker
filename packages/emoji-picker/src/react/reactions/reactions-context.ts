import * as React from "react";
import { withoutTone } from "@brianhung/emoji-picker-core";

export type ReactionsState = {
  reactions: readonly string[];
  open: boolean;
  expand?: () => void;
  pressed: ReadonlySet<string> | null;
};
export const ReactionsContext = React.createContext<ReactionsState | null>(null);

export const reactionKey = (unified: string) => withoutTone(unified.toLowerCase());

export const isPressed = (selected: ReadonlySet<string>, unified: string) => selected.has(reactionKey(unified));
