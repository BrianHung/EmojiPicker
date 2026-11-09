"use client";

import * as React from "react";
import { FocusScope, useFocusManager, type FocusManager } from "react-aria/FocusScope";
import { mergeProps } from "react-aria/mergeProps";
import { Toolbar, type ToolbarProps } from "react-aria-components/Toolbar";

export type EmojiReactionBarProps = Omit<ToolbarProps, "children"> & { children: React.ReactNode };

function Manager({ into }: { into: React.RefObject<FocusManager | undefined> }) {
  const manager = useFocusManager();
  React.useEffect(() => {
    into.current = manager;
  }, [into, manager]);
  return null;
}

// React Aria's Toolbar moves focus with the arrows and Tab; Home and End go to the ends
export function EmojiReactionBar({ orientation = "horizontal", children, ...props }: EmojiReactionBarProps) {
  const focus = React.useRef<FocusManager | undefined>(undefined);
  const across = orientation === "vertical" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
  const handlers: React.HTMLAttributes<HTMLDivElement> = {
    onKeyDown(event) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === "Home") focus.current?.focusFirst();
      else if (event.key === "End") focus.current?.focusLast();
      else if (!across.includes(event.key)) return;
      event.preventDefault();
    },
  };
  return (
    <Toolbar {...props} orientation={orientation} render={(dom) => <div {...mergeProps(dom, handlers)} />}>
      <FocusScope>
        <Manager into={focus} />
        {children}
      </FocusScope>
    </Toolbar>
  );
}
