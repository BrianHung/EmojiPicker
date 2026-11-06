import * as React from "react";

export type ReactionsState = {
  reactions: readonly string[];
  open: boolean;
  expand?: () => void;
  panel: React.RefObject<HTMLDivElement | null>;
  panelId: string;
  registerPanel(): () => void;
};
export const ReactionsContext = React.createContext<ReactionsState | null>(null);
