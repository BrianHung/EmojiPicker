// Internal: what a horizontal List shares with the rest of the picker. The engine
// tracks the current section from vertical scroll only, so while a horizontal List
// is mounted, CategoryNav tabs, useCategoryNavigation and useActiveEmoji read this
// instead.
import * as React from "react";
import type { EmojiRecord } from "../core/dataset";
import type { KeyboardAction } from "./keymap";

export type StripNav = {
  /** Section id under the strip's start edge. */
  active: string | null;
  /** Scroll the strip to a section; `instant` skips the smooth scroll (keyboard). */
  jump: (id: string, options?: { instant?: boolean }) => void;
  /** Move focus into the grid (its current cell). */
  focus: () => boolean;
  /** focusModel "input": a key from the search field moves the strip's highlight. True when it took the key. */
  key: (action: KeyboardAction, input: HTMLInputElement) => boolean;
  /** Drops that highlight (the field lost focus). */
  clear: () => void;
  /** The highlighted cell's id, for the field's aria-activedescendant. */
  activeDescendant?: string;
};

/** The mounted horizontal List's navigation, or null (vertical list or none). */
export const StripNavContext = React.createContext<StripNav | null>(null);
/** The List registers its navigation here (null on unmount). */
export const StripRegisterContext = React.createContext<(nav: StripNav | null) => void>(() => {});
/** Hovered or focused emoji in the horizontal List. */
export const StripActiveEmojiContext = React.createContext<EmojiRecord | null>(null);
export const StripSetActiveEmojiContext = React.createContext<(record: EmojiRecord | null) => void>(() => {});

/** What Root computes for its sections; read by the horizontal List. */
export type PickerData = {
  /** Suggested / frequently used section, skin tone applied. */
  suggested: readonly string[];
  /** Hide emoji newer than this emoji version. */
  emojiVersion?: number;
  /** Select an emoji (skin tone applied) and notify Root's onSelect. */
  pick: (record: EmojiRecord) => void;
  /** Root focuses the search field on mount (marked `data-autofocus` for EmojiPopover). */
  autoFocusSearch: boolean;
  focusModel: FocusModel;
  pointer: PointerModel;
};
export const PickerDataContext = React.createContext<PickerData>({ suggested: [], pick: () => {}, autoFocusSearch: false, focusModel: "input", pointer: "follows" });

/**
 * Where keyboard focus lives while navigating. "input": it stays in the search field
 * and a highlight moves through the grid (a combobox with aria-activedescendant,
 * as Linear and Discord do). "grid": arrows move focus into the cells (roving
 * tabindex, as Slack does).
 */
export type FocusModel = "input" | "grid";
/**
 * What hovering does to the keyboard position. "follows": the hovered emoji becomes
 * where arrows continue from and what Enter picks (Discord); with focus in the grid,
 * focus follows the pointer. "independent": hover is only a hover style (Linear, Slack).
 */
export type PointerModel = "follows" | "independent";

/** Holds the strip state at Root, so a state change re-renders only its readers. */
export function StripProvider({ children }: { children: React.ReactNode }) {
  const [nav, setNav] = React.useState<StripNav | null>(null);
  const [active, setActive] = React.useState<EmojiRecord | null>(null);
  return React.createElement(
    StripRegisterContext.Provider,
    { value: setNav },
    React.createElement(
      StripNavContext.Provider,
      { value: nav },
      React.createElement(StripSetActiveEmojiContext.Provider, { value: setActive }, React.createElement(StripActiveEmojiContext.Provider, { value: active }, children)),
    ),
  );
}
