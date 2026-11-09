"use client";

import * as React from "react";
import { FocusScope, useFocusManager, type FocusManager } from "react-aria/FocusScope";
import { Toolbar } from "react-aria-components/Toolbar";
import { mergePartProps } from "../../internals/mergePartProps";
import { hasModifier } from "../../internals/usePickerKeyDown";
import { resolve, toRenderFunction } from "../../internals/renderElement";
import type { ElementProps, EmojiComponentsPartProps } from "../../internals/types";
import type { EmojiPickerOrientation } from "./types";
import { useLayoutEffect } from "../../utils/useLayoutEffect";

type ToolbarProps<S> = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style" | "children"> &
  EmojiComponentsPartProps<S, HTMLDivElement> & {
    orientation: EmojiPickerOrientation;
    state: S;
    handlers?: React.HTMLAttributes<HTMLElement>;
    toolbarRef?: React.Ref<HTMLDivElement>;
    children: React.ReactNode;
  };

const div = (props: ElementProps<HTMLDivElement>) => <div {...props} />;

function FocusManagerRef({ into }: { into: React.MutableRefObject<FocusManager | undefined> }) {
  const manager = useFocusManager();
  useLayoutEffect(() => {
    into.current = manager;
  }, [into, manager]);
  return null;
}

// React Aria's Toolbar moves focus with the arrows and Tab, and flips them in RTL; Home and End go to the ends, and the cross axis is kept from scrolling the page
export function ToolbarPart<S>({ orientation, state, className, style, render, handlers, toolbarRef, children, "aria-label": label, "aria-labelledby": labelledBy, ...props }: ToolbarProps<S>) {
  const focus = React.useRef<FocusManager | undefined>(undefined);
  const custom = toRenderFunction(render) ?? div;
  const across = orientation === "vertical" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
  const keys: React.HTMLAttributes<HTMLElement> = {
    onKeyDown(event) {
      if (event.defaultPrevented || hasModifier(event)) return;
      if (event.key === "Home") focus.current?.focusFirst();
      else if (event.key === "End") focus.current?.focusLast();
      else if (!across.includes(event.key)) return;
      event.preventDefault();
    },
  };
  return (
    <Toolbar
      ref={toolbarRef}
      orientation={orientation}
      aria-label={label}
      aria-labelledby={labelledBy}
      className={() => resolve(className, state) ?? ""}
      style={() => resolve(style, state)}
      render={(dom) => custom(mergePartProps(props, dom, keys, handlers), state)}
    >
      <FocusScope>
        <FocusManagerRef into={focus} />
        {children}
      </FocusScope>
    </Toolbar>
  );
}
