"use client";

import { mergeProps } from "react-aria/mergeProps";

const skipped = new WeakSet<object>();
const nativeOf = (event: object) => (event as { nativeEvent?: object }).nativeEvent ?? event;

export const isSkipped = (event: object) => skipped.has(nativeOf(event));

type Handler = (event: never) => void;
const mapHandlers = (props: object, wrap: (fn: (event: object) => void) => Handler) => Object.fromEntries(Object.entries(props).map(([key, value]) => [key, /^on[A-Z]/.test(key) && typeof value === "function" ? wrap(value) : value]));

export const preventable = <E extends object>(event: E) => Object.assign(event, { preventEmojiComponentsHandler: () => void skipped.add(nativeOf(event)) });

export const exposeSkip = (props: object) => mapHandlers(props, (fn) => (event: object) => fn(preventable(event)));

const guard = (props: object) => mapHandlers(props, (fn) => (event: object) => !isSkipped(event) && fn(event));

// The user's handlers run first; preventEmojiComponentsHandler() in one skips the part's handlers for that event
export const mergePartProps = <T extends object>(user: object, ...own: (object | null | undefined)[]): T => mergeProps(exposeSkip(user), ...own.map((props) => props && guard(props))) as T;
