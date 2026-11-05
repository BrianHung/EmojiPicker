import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { FocusScope, useFocusManager, type FocusManager } from "react-aria/FocusScope";
import { Toolbar } from "react-aria-components/Toolbar";
import { hasModifier } from "../utils/keyboard";
import { racClassName, toRenderFunction, type ElementProps, type PartProps } from "../utils/render";

export const BUTTONS = "button:not([disabled])";

export type ReactionBarState = { orientation: "horizontal" | "vertical" };

export type ReactionBarProps = Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style"> &
  PartProps<ReactionBarState, HTMLDivElement> & {
    orientation?: "horizontal" | "vertical";
  };

const div = (props: ElementProps<HTMLDivElement>) => <div {...props} />;

function FocusManagerRef({ into }: { into: React.MutableRefObject<FocusManager | undefined> }) {
  into.current = useFocusManager();
  return null;
}

// React Aria's Toolbar moves focus with the arrows and Tab; Home and End go to the ends, and the pointer carries focus once it is inside
export const ReactionBar = React.forwardRef<HTMLDivElement, ReactionBarProps>(function ReactionBar({ orientation = "horizontal", className, render, children, ...props }, ref) {
  const focus = React.useRef<FocusManager | undefined>(undefined);
  const custom = toRenderFunction(render) ?? div;
  const across = orientation === "vertical" ? ["ArrowLeft", "ArrowRight"] : ["ArrowUp", "ArrowDown"];
  const handlers: React.HTMLAttributes<HTMLElement> = {
    onKeyDown(event) {
      if (event.defaultPrevented || hasModifier(event)) return;
      if (event.key === "Home") focus.current?.focusFirst();
      else if (event.key === "End") focus.current?.focusLast();
      else if (!across.includes(event.key)) return;
      event.preventDefault();
    },
    onPointerOver(event) {
      const button = event.target instanceof Element ? event.target.closest<HTMLElement>(BUTTONS) : null;
      const active = document.activeElement;
      const row = event.currentTarget;
      if (button && button !== active && row.contains(button) && active instanceof HTMLElement && row.contains(active)) button.focus({ preventScroll: true });
    },
  };
  return (
    <Toolbar {...(props as object)} ref={ref} orientation={orientation} className={racClassName(className)} render={(dom, state) => custom(mergeProps(dom, handlers) as ElementProps<HTMLDivElement>, state)}>
      <FocusScope>
        <FocusManagerRef into={focus} />
        {children}
      </FocusScope>
    </Toolbar>
  );
});
