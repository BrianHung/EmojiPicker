import type * as React from "react";
import { mergeProps } from "react-aria/mergeProps";

export type PickerEvent<E = React.SyntheticEvent> = E & { preventEmojiPickerHandler(): void };

// A part's props with every handler's event able to skip the part's own handler, as Base UI's preventBaseUIHandler
export type PickerHandlers<P> = { [K in keyof P]: K extends `on${string}` ? (NonNullable<P[K]> extends (event: infer E) => void ? ((event: PickerEvent<E>) => void) | undefined : P[K]) : P[K] };

const skipped = new WeakSet<object>();
const nativeOf = (event: object) => (event as { nativeEvent?: object }).nativeEvent ?? event;

export const isSkipped = (event: object) => skipped.has(nativeOf(event));

type Handler = (event: never) => void;
const mapHandlers = (props: object, wrap: (fn: (event: object) => void) => Handler) => Object.fromEntries(Object.entries(props).map(([key, value]) => [key, /^on[A-Z]/.test(key) && typeof value === "function" ? wrap(value) : value]));

export const preventable = <E extends object>(event: E) => Object.assign(event, { preventEmojiPickerHandler: () => void skipped.add(nativeOf(event)) });

export const exposeSkip = (props: object) => mapHandlers(props, (fn) => (event: object) => fn(preventable(event)));

const guard = (props: object) => mapHandlers(props, (fn) => (event: object) => !isSkipped(event) && fn(event));

// The user's handlers run first; preventEmojiPickerHandler() in one skips the part's handlers for that event
export const mergePartProps = <T extends object>(user: object, ...own: (object | null | undefined)[]): T => mergeProps(exposeSkip(user), ...own.map((props) => props && guard(props))) as T;
