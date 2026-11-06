import * as React from "react";
import { FocusScope, useFocusManager, type FocusManager } from "react-aria/FocusScope";
import { Toolbar } from "react-aria-components/Toolbar";
import { mergePartProps, type PickerHandlers } from "../utils/events";
import { hasModifier } from "../utils/keyboard";
import { racClassName, toRenderFunction, type ElementProps, type Orientation, type PartProps } from "../utils/render";

export const BUTTONS = "button:not([disabled])";

export type ReactionBarState = { orientation: Orientation };

export type ReactionBarProps = PickerHandlers<Omit<React.HTMLAttributes<HTMLDivElement>, "role" | "className" | "style">> &
  PartProps<ReactionBarState, HTMLDivElement> & {
    orientation?: Orientation;
  };

const div = (props: ElementProps<HTMLDivElement>) => <div {...props} />;

function FocusManagerRef({ into }: { into: React.MutableRefObject<FocusManager | undefined> }) {
  into.current = useFocusManager();
  return null;
}

// React Aria's Toolbar moves focus with the arrows and Tab; Home and End go to the ends, and the pointer carries focus once it is inside
export const ReactionBar = React.forwardRef<HTMLDivElement, ReactionBarProps>(function ReactionBar({ orientation = "horizontal", className, style, render, children, "aria-label": label, "aria-labelledby": labelledBy, ...props }, ref) {
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
    <Toolbar ref={ref} orientation={orientation} aria-label={label} aria-labelledby={labelledBy} className={racClassName(className)} style={style} render={(dom, state) => custom(mergePartProps(props, dom, handlers), state)}>
      <FocusScope>
        <FocusManagerRef into={focus} />
        {children}
      </FocusScope>
    </Toolbar>
  );
});
