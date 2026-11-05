import * as React from "react";
import { withoutTone } from "@brianhung/emoji-picker-core";

export type ReactionsState = {
  reactions: readonly string[];
  open: boolean;
  expand?: () => void;
  panel: React.RefObject<HTMLDivElement | null>;
  registerPanel(): () => void;
};
export const ReactionsContext = React.createContext<ReactionsState | null>(null);

export const isPressed = (selected: ReadonlySet<string>, unified: string) => selected.has(withoutTone(unified));
