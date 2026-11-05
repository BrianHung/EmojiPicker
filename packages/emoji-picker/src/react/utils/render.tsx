import * as React from "react";
import { composeRenderProps } from "react-aria-components/composeRenderProps";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";

/** The props a part hands to `render`: spread them (with the ref) onto your element. */
export type ElementProps<E extends Element = HTMLElement> = React.HTMLAttributes<E> & { ref?: React.Ref<E> };

/** Replaces a part's element: an element (the part's props and ref merge onto it) or `(props, state) => element`. */
export type RenderProp<S, E extends Element = HTMLElement> = React.ReactElement<Record<string, unknown>> | ((props: ElementProps<E>, state: S) => React.ReactElement);

/** What every part takes: `className` and `style` as values or functions of its state, and `render`. */
export type PartProps<S, E extends Element = HTMLElement> = {
  className?: string | ((state: S) => string | undefined);
  style?: React.CSSProperties | ((state: S) => React.CSSProperties | undefined);
  render?: RenderProp<S, E>;
};

type Children<S> = { children?: React.ReactNode | ((state: S) => React.ReactNode) };

/** A part's DOM attributes, with `className`, `style` and `children` as values or functions of its state, and `render`. */
export type PartElementProps<S, E extends Element = HTMLDivElement, Omitted extends string = never> = Omit<React.HTMLAttributes<E>, "className" | "style" | "children" | Omitted> & PartProps<S, E> & Children<S>;

type Input<S, E extends Element> = Omit<React.AllHTMLAttributes<E>, "className" | "style" | "children"> & { ref?: React.Ref<E> } & PartProps<S, E> & Children<S> & { [data: `data-${string}`]: unknown };

const elementRef = (element: React.ReactElement): React.Ref<unknown> | undefined =>
  Number(React.version.split(".")[0]) >= 19 ? (element.props as { ref?: React.Ref<unknown> }).ref : (element as unknown as { ref?: React.Ref<unknown> }).ref;

/** `render` as React Aria's DOM render function. */
export function toRenderFunction<S, E extends Element>(render: RenderProp<S, E> | undefined): ((props: ElementProps<E>, state: S) => React.ReactElement) | undefined {
  if (!render || typeof render === "function") return render;
  return (props) => React.cloneElement(render, { ...mergeProps(props, render.props), ref: mergeRefs(props.ref, elementRef(render)) });
}

/** A value, or a function of state called with it. */
export const resolve = <T, S>(value: T | ((state: S) => T), state: S): T => composeRenderProps<T, S, T>(value as never, (v) => v)(state);

/** A part's element for its state: `className`, `style` and `children` resolved, through `render` when given. */
export function renderElement<S, E extends Element = HTMLElement>(tag: keyof React.JSX.IntrinsicElements, { render, ...props }: Input<S, E>, state: S) {
  // Resolved in place: the element keeps its attributes in the order given.
  const resolved = { ...props, className: resolve(props.className, state), style: resolve(props.style, state), children: resolve(props.children, state) } as ElementProps<E>;
  const custom = toRenderFunction(render);
  return custom ? custom(resolved, state) : React.createElement(tag, resolved);
}

/** `className` for a React Aria component: theirs is a string or a function returning one (never undefined, which would apply their default class). */
export const racClassName =
  <S,>(className: PartProps<S>["className"]) =>
  (state: S): string =>
    resolve(className, state) ?? "";

/** A React Aria button's or field's state, named as the other parts name theirs. */
export type InteractionState = { hovered: boolean; focused: boolean; focusVisible: boolean; pressed: boolean; disabled: boolean };

export type RacState = { isHovered: boolean; isFocused: boolean; isFocusVisible: boolean; isPressed?: boolean; isDisabled: boolean; isSelected?: boolean };

export const racState = (r: RacState): InteractionState & { selected: boolean } => ({
  hovered: r.isHovered,
  focused: r.isFocused,
  focusVisible: r.isFocusVisible,
  pressed: Boolean(r.isPressed),
  disabled: r.isDisabled,
  selected: Boolean(r.isSelected),
});

/** A part's `className`, `style` and `render` for a React Aria component, called with `InteractionState` rather than its render props. */
export function racParts<S extends InteractionState, E extends Element>({ className, style, render }: PartProps<S, E>) {
  const state = racState as unknown as (r: RacState) => S;
  const custom = toRenderFunction(render);
  return {
    className: (r: RacState) => resolve(className, state(r)) ?? "",
    style: (r: RacState) => resolve(style, state(r)),
    render: custom && ((props: ElementProps<E>, r: RacState) => custom(props, state(r))),
  };
}
