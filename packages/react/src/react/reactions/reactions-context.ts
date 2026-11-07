"use client";

import * as React from "react";

export interface ReactionsContextValue {
  reactions: readonly string[];
  open: boolean;
  // Opens the Panel and moves focus into it; absent while no Panel is mounted
  expand?: (event?: Event) => void;
  row: React.RefObject<HTMLDivElement | null>;
  panel: React.RefObject<HTMLDivElement | null>;
  panelId: string;
  registerPanel(): () => void;
}

export const ReactionsContext = React.createContext<ReactionsContextValue | null>(null);
