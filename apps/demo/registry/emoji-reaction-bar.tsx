"use client";

import * as React from "react";
import { FocusScope, useFocusManager, type FocusManager } from "react-aria/FocusScope";
import { mergeProps } from "react-aria/mergeProps";
import { Toolbar, type ToolbarProps } from "react-aria-components/Toolbar";

export type ReactionBarProps = Omit<ToolbarProps, "children"> & { children: React.ReactNode };

function Manager({ into }: { into: React.RefObject<FocusManager | undefined> }) {
  const manager = useFocusManager();
  React.useEffect(() => {
    into.current = manager;
  }, [into, manager]);
  return null;
}

// React Aria's Toolbar moves focus with the arrows and Tab; Home and End go to the ends, and once focus is inside, the pointer carries it
export function ReactionBar({ orientation = "horizontal", children, ...props }: ReactionBarProps) {
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
    onPointerOver(event) {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>("button:not([disabled])") : null;
      const active = document.activeElement;
      const row = event.currentTarget;
      if (button && button !== active && row.contains(button) && active instanceof HTMLElement && row.contains(active)) button.focus({ preventScroll: true });
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
