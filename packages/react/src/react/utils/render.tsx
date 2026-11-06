import * as React from "react";
import { composeRenderProps } from "react-aria-components/composeRenderProps";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import type { PickerHandlers } from "./events";

export type Orientation = "horizontal" | "vertical";

// Base UI's convention: a present state attribute is empty, an absent one is undefined
export const flag = (on: unknown): "" | undefined => (on ? "" : undefined);

export type ElementProps<E extends Element = HTMLElement> = React.HTMLAttributes<E> & { ref?: React.Ref<E> };

export type RenderProp<S, E extends Element = HTMLElement> = React.ReactElement<Record<string, unknown>> | ((props: ElementProps<E>, state: S) => React.ReactElement);

export type PartProps<S, E extends Element = HTMLElement> = {
  className?: string | ((state: S) => string | undefined);
  style?: React.CSSProperties | ((state: S) => React.CSSProperties | undefined);
  render?: RenderProp<S, E>;
};

type Children<S> = { children?: React.ReactNode | ((state: S) => React.ReactNode) };

export type PartElementProps<S, E extends Element = HTMLDivElement, Omitted extends string = never> = PickerHandlers<Omit<React.HTMLAttributes<E>, "className" | "style" | "children" | Omitted>> & PartProps<S, E> & Children<S>;

type Input<S, E extends Element> = Omit<React.AllHTMLAttributes<E>, "className" | "style" | "children"> & { ref?: React.Ref<E> } & PartProps<S, E> & Children<S> & { [data: `data-${string}`]: unknown };

const elementRef = (element: React.ReactElement): React.Ref<unknown> | undefined =>
  Number(React.version.split(".")[0]) >= 19 ? (element.props as { ref?: React.Ref<unknown> }).ref : (element as unknown as { ref?: React.Ref<unknown> }).ref;

export function toRenderFunction<S, E extends Element>(render: RenderProp<S, E> | undefined): ((props: ElementProps<E>, state: S) => React.ReactElement) | undefined {
  if (!render || typeof render === "function") return render;
  return (props) => React.cloneElement(render, { ...mergeProps(props, render.props), ref: mergeRefs(props.ref, elementRef(render)) });
}

export const resolve = <T, S>(value: T | ((state: S) => T), state: S): T => composeRenderProps<T, S, T>(value as never, (v) => v)(state);

export function renderElement<S, E extends Element = HTMLElement>(tag: keyof React.JSX.IntrinsicElements, { render, ...props }: Input<S, E>, state: S) {
  const resolved = { ...props, className: resolve(props.className, state), style: resolve(props.style, state), children: resolve(props.children, state) } as ElementProps<E>;
  const custom = toRenderFunction(render);
  return custom ? custom(resolved, state) : React.createElement(tag, resolved);
}

export const racClassName =
  <S,>(className: PartProps<S>["className"]) =>
  (state: S): string =>
    resolve(className, state) ?? "";

export type InteractionState = { hovered: boolean; focused: boolean; focusVisible: boolean; pressed: boolean; disabled: boolean };

type RacState = { isHovered: boolean; isFocused: boolean; isFocusVisible: boolean; isDisabled: boolean };

const racState = (r: RacState): InteractionState => ({ hovered: r.isHovered, focused: r.isFocused, focusVisible: r.isFocusVisible, pressed: false, disabled: r.isDisabled });

// React Aria writes its state attributes as "true"
const presence = (props: object) => Object.fromEntries(Object.entries(props).map(([k, v]) => [k, k.startsWith("data-") && v === true ? "" : v]));

export function racParts<S extends InteractionState, E extends Element>(tag: keyof React.JSX.IntrinsicElements, { className, style, render }: PartProps<S, E>) {
  const state = racState as unknown as (r: RacState) => S;
  const custom = toRenderFunction(render);
  return {
    className: (r: RacState) => resolve(className, state(r)) ?? "",
    style: (r: RacState) => resolve(style, state(r)),
    render: (props: ElementProps<E>, r: RacState) => (custom ? custom(presence(props) as ElementProps<E>, state(r)) : React.createElement(tag, presence(props))),
  };
}
