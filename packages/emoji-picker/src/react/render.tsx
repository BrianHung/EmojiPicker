import * as React from "react";
import { composeRenderProps } from "react-aria-components/composeRenderProps";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";

/** The props a part hands to `render`: spread them (with the ref) onto your element. */
export type ElementProps = React.AllHTMLAttributes<any> & { ref?: React.Ref<any> };

/** Replaces a part's element: an element (the part's props and ref merge onto it) or `(props, state) => element`. */
export type RenderProp<S> = React.ReactElement<Record<string, unknown>> | ((props: ElementProps, state: S) => React.ReactElement);

/** What every part takes: `className` and `style` as values or functions of its state, and `render`. */
export type PartProps<S> = {
  className?: string | ((state: S) => string | undefined);
  style?: React.CSSProperties | ((state: S) => React.CSSProperties | undefined);
  render?: RenderProp<S>;
};

type Children<S> = { children?: React.ReactNode | ((state: S) => React.ReactNode) };

/** A part's DOM attributes, with `className`, `style` and `children` as values or functions of its state, and `render`. */
export type PartElementProps<S, E extends Element = HTMLDivElement, Omitted extends string = never> = Omit<React.HTMLAttributes<E>, "className" | "style" | "children" | Omitted> & PartProps<S> & Children<S>;

type Input<S> = Omit<ElementProps, "className" | "style" | "children"> & PartProps<S> & Children<S> & { [data: `data-${string}`]: unknown };

const elementRef = (element: React.ReactElement): React.Ref<unknown> | undefined =>
  Number(React.version.split(".")[0]) >= 19 ? (element.props as { ref?: React.Ref<unknown> }).ref : (element as unknown as { ref?: React.Ref<unknown> }).ref;

/** `render` as React Aria's DOM render function. */
export function toRenderFunction<S>(render: RenderProp<S> | undefined): ((props: ElementProps, state: S) => React.ReactElement) | undefined {
  if (!render || typeof render === "function") return render;
  return (props) => React.cloneElement(render, { ...mergeProps(props, render.props), ref: mergeRefs(props.ref, elementRef(render)) });
}

/** A value, or a function of state called with it. */
export const resolve = <T, S>(value: T | ((state: S) => T), state: S): T => composeRenderProps<T, S, T>(value as never, (v) => v)(state);

/** A part's element for its state: `className`, `style` and `children` resolved, through `render` when given. */
export function renderElement<S>(tag: keyof React.JSX.IntrinsicElements, { render, className, style, children, ...props }: Input<S>, state: S) {
  const resolved: ElementProps = { ...props, className: resolve(className, state), style: resolve(style, state), children: resolve(children, state) };
  const custom = toRenderFunction(render);
  return custom ? custom(resolved, state) : React.createElement(tag, resolved);
}

/** `className` for a React Aria component: theirs is a string or a function returning one (never undefined, which would apply their default class). */
export const racClassName =
  <S,>(className: PartProps<S>["className"]) =>
  (state: S): string =>
    resolve(className, state) ?? "";
