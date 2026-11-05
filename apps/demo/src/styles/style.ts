import type * as React from "react";
import type { EmojiSelection, SearchResultsMode } from "@brianhung/emoji-picker";

/** A style's CSS variables, values in light-dark() so one definition covers both themes. Set inline on each `data-style` element. */
export type Tokens = React.CSSProperties & Record<`--${string}`, string>;

export type StylePickerProps = {
  onSelect?: (selection: EmojiSelection) => void;
  /** Include the search row. Default true. */
  search?: boolean;
  /** Focus search on mount, as the real popovers do on open. */
  autoFocus?: boolean;
  /** As many columns as the width fits instead of the app's count (a full-width sheet). */
  fluid?: boolean;
  searchResults?: SearchResultsMode;
  className?: string;
};

export type Style = {
  id: string;
  label: string;
  tokens: Tokens;
  Picker: React.ComponentType<StylePickerProps>;
  /** The picker reactions open, when it differs (Notion's has no tabs or shuffle). */
  ReactionPicker?: React.ComponentType<StylePickerProps>;
  /** Fixed renderer for this style (Discord draws Twemoji everywhere). */
  renderer?: "native" | "twemoji";
  /** Popover size, for positioning. */
  size: { width: number; height: number };
  tapback: {
    className: string;
    reactions: string;
    /** Fixed reactions instead of the user's top frequents (Instagram, Messenger). */
    pinned?: string[];
    /** Classes and contents of the "+" that opens the full picker. */
    more?: { className: string; icon: React.ReactNode };
  };
  autocomplete: {
    className: string;
    /** The options list (padding, height); replaces the default `max-h-64 p-1`. */
    list?: string;
    item: string;
    match: string;
    matchActive?: string;
    header?: (q: string) => React.ReactNode;
    headerClassName?: string;
    showName?: boolean;
    /** Emoji size in px (default 22). */
    emoji?: number;
    /** Shown at the end of the highlighted option (Slack's "Enter"). */
    hint?: React.ReactNode;
  };
  /** `emoji`: pill emoji size in px (default 16); `count`: count classes (default semibold). */
  pill: { base: string; mine: string; add: string; emoji?: number; count?: string; addIcon?: React.ReactNode };
};

/** The tokens of a style, for an element's `style`. */
export const tokensOf = (style: Pick<Style, "tokens"> | undefined): React.CSSProperties | undefined => style?.tokens;

/**
 * What every style's Root carries besides its look: a column that fits a popover (`--available-height`),
 * the emoji font, no transitions with reduced motion, no WebKit search decorations.
 */
export const ROOT =
  "relative flex max-h-(--available-height) max-w-full flex-col overflow-hidden **:box-border motion-reduce:duration-0 motion-reduce:**:duration-0 [&_input::-webkit-search-cancel-button]:appearance-none [--emoji-font-family:'Segoe_UI_Emoji','Segoe_UI_Symbol','Segoe_UI','Apple_Color_Emoji','Twemoji_Mozilla','Noto_Color_Emoji','EmojiOne_Color','Android_Emoji']";

/** What every style's cell carries: a centered glyph, and an outline in forced colors, where backgrounds are dropped. */
export const CELL =
  "relative flex cursor-default items-center justify-center overflow-hidden leading-none outline-none forced-colors:[&:is([data-highlighted],[data-focus-visible])]:[outline:2px_solid_Highlight] forced-colors:[&:is([data-highlighted],[data-focus-visible])]:[outline-offset:-2px]";

/** A suggestion menu's option: an outline in forced colors. */
export const OPTION = "forced-colors:data-highlighted:[outline:2px_solid_Highlight] forced-colors:data-highlighted:[outline-offset:-2px]";
