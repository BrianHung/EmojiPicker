"use client";

import * as React from "react";
import { mergeProps } from "react-aria/mergeProps";
import { mergeRefs } from "react-aria/mergeRefs";
import type { EmojiPickerHandlers } from "./events";

export type EmojiPickerOrientation = "horizontal" | "vertical";

// Base UI's convention: a present state attribute is empty, an absent one is undefined
export const flag = (on: unknown): "" | undefined => (on ? "" : undefined);

export type ElementProps<E extends Element = HTMLElement> = React.HTMLAttributes<E> & { ref?: React.Ref<E> };

export type RenderProp<S, E extends Element = HTMLElement> = React.ReactElement<Record<string, unknown>> | ((props: ElementProps<E>, state: S) => React.ReactElement);

export interface EmojiPickerPartProps<S, E extends Element = HTMLElement> {
  className?: string | ((state: S) => string | undefined);
  style?: React.CSSProperties | ((state: S) => React.CSSProperties | undefined);
  render?: RenderProp<S, E>;
}

type Children<S> = { children?: React.ReactNode | ((state: S) => React.ReactNode) };

export type EmojiPickerPartElementProps<S, E extends Element = HTMLDivElement, Omitted extends string = never> = EmojiPickerHandlers<Omit<React.HTMLAttributes<E>, "className" | "style" | "children" | Omitted>> &
  EmojiPickerPartProps<S, E> &
  Children<S>;

type DataAttributes = { [data: `data-${string}`]: unknown };
type Input<S, E extends Element> = Omit<React.AllHTMLAttributes<E>, "className" | "style" | "children"> & { ref?: React.Ref<E> } & EmojiPickerPartProps<S, E> & Children<S> & DataAttributes;

type RefCarrier<E> = { ref?: React.Ref<E>; props: { ref?: React.Ref<E> } };
// React 19 moved an element's ref into its props
export const elementRef = <E,>(element: React.ReactElement): React.Ref<E> | undefined => {
  const carrier: RefCarrier<E> = element as React.ReactElement & RefCarrier<E>;
  return Number(React.version.split(".")[0]) >= 19 ? carrier.props.ref : carrier.ref;
};

export function toRenderFunction<S, E extends Element>(render: RenderProp<S, E> | undefined): ((props: ElementProps<E>, state: S) => React.ReactElement) | undefined {
  if (!render || typeof render === "function") return render;
  return (props) => React.cloneElement(render, { ...mergeProps(props, render.props), ref: mergeRefs(props.ref, elementRef(render)) });
}

const isStateFunction = <T, S>(value: T | ((state: S) => T)): value is (state: S) => T => typeof value === "function";

export const resolve = <T, S>(value: T | ((state: S) => T), state: S): T => (isStateFunction(value) ? value(state) : value);

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// Base UI's state attributes: data-<key> for each listed key, "" for true and the value for a string or number
export function stateAttributes<S>(state: S, keys: readonly (keyof S & string)[]): Record<`data-${string}`, string | undefined> {
  const out: Record<`data-${string}`, string | undefined> = {};
  for (const key of keys) {
    const value = state[key];
    out[`data-${kebab(key)}`] = typeof value === "boolean" ? flag(value) : typeof value === "string" || typeof value === "number" ? String(value) : undefined;
  }
  return out;
}

export function renderElement<S, E extends Element = HTMLElement>(tag: keyof React.JSX.IntrinsicElements, { render, ...props }: Input<S, E>, state: S, attributes: readonly (keyof S & string)[] = []) {
  const resolved: ElementProps<E> = { ...props, ...stateAttributes(state, attributes), className: resolve(props.className, state), style: resolve(props.style, state), children: resolve(props.children, state) };
  const custom = toRenderFunction(render);
  return custom ? custom(resolved, state) : React.createElement(tag, resolved);
}

export interface EmojiPickerInteractionState {
  hovered: boolean;
  focused: boolean;
  focusVisible: boolean;
  pressed: boolean;
  disabled: boolean;
}

type RacState = { isHovered: boolean; isFocused: boolean; isFocusVisible: boolean; isDisabled: boolean };

const racState = (r: RacState): EmojiPickerInteractionState => ({ hovered: r.isHovered, focused: r.isFocused, focusVisible: r.isFocusVisible, pressed: false, disabled: r.isDisabled });

// React Aria writes its state attributes as "true"
const presence = (props: object) => Object.fromEntries(Object.entries(props).map(([k, v]) => [k, k.startsWith("data-") && v === true ? "" : v]));

// A part's className, style, and render mapped onto a React Aria component's render props
export function racParts<E extends Element>(tag: keyof React.JSX.IntrinsicElements, { className, style, render }: EmojiPickerPartProps<EmojiPickerInteractionState, E>) {
  const custom = toRenderFunction(render);
  return {
    className: (r: RacState) => resolve(className, racState(r)) ?? "",
    style: (r: RacState) => resolve(style, racState(r)),
    render: (props: ElementProps<E>, r: RacState) => (custom ? custom(presence(props), racState(r)) : React.createElement(tag, presence(props))),
  };
}
