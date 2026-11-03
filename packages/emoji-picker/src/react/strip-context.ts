// Internal: what a horizontal List shares with the rest of the picker. The engine
// tracks the current section from vertical scroll only, so while a horizontal List
// is mounted, CategoryNav tabs, useCategoryNavigation and useActiveEmoji read this
// instead.
import * as React from "react";
import type { EmojiRecord } from "../core/dataset";

export type StripNav = {
  /** Section id under the strip's start edge. */
  active: string | null;
  /** Scroll the strip to a section. */
  jump: (id: string) => void;
  /** Move focus into the grid (its current cell). */
  focus: () => boolean;
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
};
export const PickerDataContext = React.createContext<PickerData>({ suggested: [], pick: () => {} });

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
