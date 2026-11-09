import type * as React from "react";

export type EmojiComponentsEvent<E = React.SyntheticEvent> = E & { preventEmojiComponentsHandler(): void };

// A part's props with every handler's event able to skip the part's own handler, as Base UI's preventBaseUIHandler
export type EmojiComponentsHandlers<P> = { [K in keyof P]: K extends `on${string}` ? (NonNullable<P[K]> extends (event: infer E) => void ? ((event: EmojiComponentsEvent<E>) => void) | undefined : P[K]) : P[K] };

export type ElementProps<E extends Element = HTMLElement> = React.HTMLAttributes<E> & { ref?: React.Ref<E> };

export type RenderProp<S, E extends Element = HTMLElement> = React.ReactElement<Record<string, unknown>> | ((props: ElementProps<E>, state: S) => React.ReactElement);

export interface EmojiComponentsPartProps<S, E extends Element = HTMLElement> {
  className?: string | ((state: S) => string | undefined);
  style?: React.CSSProperties | ((state: S) => React.CSSProperties | undefined);
  render?: RenderProp<S, E>;
}

type Children<S> = { children?: React.ReactNode | ((state: S) => React.ReactNode) };

export type EmojiComponentsPartElementProps<S, E extends Element = HTMLDivElement, Omitted extends string = never> = EmojiComponentsHandlers<Omit<React.HTMLAttributes<E>, "className" | "style" | "children" | Omitted>> &
  EmojiComponentsPartProps<S, E> &
  Children<S>;

export interface EmojiComponentsInteractionState {
  hovered: boolean;
  focused: boolean;
  focusVisible: boolean;
  pressed: boolean;
  disabled: boolean;
}
