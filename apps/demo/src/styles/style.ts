import type * as React from "react";
import type { EmojiSelection, EmojiPicker } from "@brianhung/emoji-picker-react";

export type Tokens = React.CSSProperties & Record<`--${string}`, string>;

export type StylePickerProps = {
  onSelect?: (selection: EmojiSelection) => void;
  search?: boolean;
  autoFocus?: boolean;
  fluid?: boolean;
  columns?: "fit" | number;
  searchResults?: EmojiPicker.Root.Props["searchResults"];
  className?: string;
};

export type Style = {
  id: string;
  label: string;
  tokens: Tokens;
  Picker: React.ComponentType<StylePickerProps>;
  ReactionPicker?: React.ComponentType<StylePickerProps>;
  renderer?: "native" | "image";
  size: { width: number; height: number };
  sheetColumns?: number;
  tapback: {
    className: string;
    reactions: string;
    pinned?: string[];
    more?: { className: string; icon: React.ReactNode };
  };
  autocomplete: {
    className: string;
    list?: string;
    item: string;
    match: string;
    matchActive?: string;
    header?: (q: string) => React.ReactNode;
    headerClassName?: string;
    showName?: boolean;
    emoji?: number;
    hint?: React.ReactNode;
  };
  pill: { base: string; mine: string; add: string; emoji?: number; count?: string; addIcon?: React.ReactNode };
};

export const tokensOf = (style: Pick<Style, "tokens"> | undefined): React.CSSProperties | undefined => style?.tokens;

export const ROOT =
  "relative flex max-h-(--available-height) max-w-full flex-col overflow-hidden **:box-border motion-reduce:duration-0 motion-reduce:**:duration-0 [&_input::-webkit-search-cancel-button]:appearance-none [--emoji-font-family:var(--site-emoji-font,)'Segoe_UI_Emoji','Segoe_UI_Symbol','Segoe_UI','Apple_Color_Emoji','Twemoji_Mozilla','Noto_Color_Emoji','EmojiOne_Color','Android_Emoji']";

export const CELL =
  "relative flex cursor-default items-center justify-center overflow-hidden leading-none outline-none forced-colors:[&:is([data-highlighted],[data-focus-visible])]:[outline:2px_solid_Highlight] forced-colors:[&:is([data-highlighted],[data-focus-visible])]:[outline-offset:-2px]";

export const OPTION = "forced-colors:data-highlighted:[outline:2px_solid_Highlight] forced-colors:data-highlighted:[outline-offset:-2px]";
