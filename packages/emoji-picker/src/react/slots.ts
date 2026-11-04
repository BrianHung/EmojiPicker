// The styling contract: every part carries a stable `data-slot`, sizes come from
// public CSS variables, and the few structural rules the layout needs live here.
import * as React from "react";
import { useStyleSheet } from "./style-sheet";

export const SLOTS = {
  root: "emoji-picker",
  search: "search",
  searchField: "search-field",
  searchInput: "search-input",
  searchClear: "search-clear",
  searchStatus: "search-status",
  categoryNav: "category-nav",
  categoryTab: "category-tab",
  viewport: "viewport",
  list: "list",
  category: "category",
  categoryHeader: "category-header",
  headerActions: "header-actions",
  emoji: "emoji",
  skinTone: "skin-tone",
  skinToneOption: "skin-tone-option",
  skinToneOptions: "skin-tone-options",
  reactions: "reactions",
  reactionsExpand: "reactions-expand",
  preview: "preview",
  panel: "panel",
  empty: "empty",
  loading: "loading",
  loadError: "load-error",
  variations: "variations",
} as const;

/** Joins class names; the later wins on conflicts only by CSS order (use tailwind-merge in your own `cn`). */
export const joinClasses = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(" ") || undefined;

const S = (slot: keyof typeof SLOTS) => `[data-slot="${SLOTS[slot]}"]`;
const EMOJI_FONT = '"Segoe UI Emoji", "Segoe UI Symbol", "Segoe UI", "Apple Color Emoji", "Twemoji Mozilla", "Noto Color Emoji", "EmojiOne Color", "Android Emoji"';

// One attribute selector per rule: it beats Tailwind's preflight and loses to any
// utility class or unlayered CSS. The private --ep-* variables resolve the public ones
// on Root, so a class there (`[--emoji-size:22px]`) or on any ancestor sets them.
const STRUCTURE = (layer: string) => `@layer ${layer}{
:where(${S("root")}){--ep-size:var(--emoji-size,30px);--ep-cell:var(--emoji-cell-size,calc(var(--ep-size) + 10px));--ep-pad:var(--emoji-list-padding,10px);--ep-header:var(--emoji-header-height,40px);--ep-glyph-pad:calc((var(--ep-cell) - var(--ep-size)) / 2)}
${S("root")}{position:relative;display:flex;flex-direction:column;overflow:clip}
:where([data-slot="popover-content"]) ${S("root")}{max-height:var(--available-height)}
:where(${S("root")} *){box-sizing:border-box}
@media (forced-colors:active){${S("emoji")}:is([data-highlighted],[data-focus-visible]){outline:2px solid Highlight!important;outline-offset:-2px!important}}
@media (prefers-reduced-motion:reduce){${S("root")},${S("root")} *{transition-duration:0s}}
:where(${S("root")}[data-columns]){width:fit-content;max-width:100%}
:where(${S("root")}[data-columns] :is(${S("preview")},${S("search")})){contain:inline-size}
:where(${S("root")}[data-columns] ${S("viewport")}){scrollbar-gutter:stable}
:where(${S("root")}[data-columns] ${S("list")}[data-orientation="vertical"])::before{content:"";display:block;height:0;width:calc(var(--ep-columns)*var(--ep-cell) + 2*var(--ep-pad));max-width:100%}
${S("searchField")}{position:relative;flex:1 1 auto;align-self:stretch;display:flex;align-items:center;min-width:0}
${S("searchInput")}{padding:0 30px;height:40px;width:100%}
${S("searchInput")}::-webkit-search-cancel-button,${S("searchInput")}::-webkit-search-decoration{-webkit-appearance:none;appearance:none}
${S("searchClear")}{display:flex;align-items:center;justify-content:center;padding:0;position:absolute;inset-inline-end:var(--ep-pad);height:30px;width:30px;top:50%;transform:translateY(-50%)}
${S("searchField")}[data-empty] ${S("searchClear")}{display:none}
${S("categoryTab")}{position:relative;height:30px;width:30px;display:flex;align-items:center;justify-content:center}
${S("categoryTab")}:has(>[data-default-icon]){display:inline-block}
${S("viewport")}{position:relative;flex:1;overflow-x:hidden;overflow-y:scroll}
:where(${S("viewport")}){overscroll-behavior:contain}
${S("viewport")}:has(${S("list")}[data-orientation="horizontal"]){overflow-x:auto;overflow-y:hidden;overscroll-behavior-x:contain}
${S("list")}{outline:none}
${S("list")}[data-orientation="horizontal"]{flex:none;width:max-content}
${S("category")}{height:100%}
${S("categoryHeader")}{display:flex;align-items:center;margin:0;width:100%;height:var(--ep-header);padding:0 var(--ep-pad)}
${S("list")}[data-results] ${S("categoryHeader")},${S("list")}[data-orientation="horizontal"] ${S("categoryHeader")}{display:block;padding:0;width:auto}
${S("emoji")}{position:relative;display:flex;align-items:center;justify-content:center;width:var(--ep-cell);height:var(--ep-cell);max-width:var(--ep-cell);max-height:var(--ep-cell);overflow:hidden;cursor:default}
${S("list")}[data-orientation="horizontal"] ${S("emoji")}{width:100%;height:100%;max-width:none;max-height:none}
[data-glyph]{position:relative;align-self:center;justify-self:center;display:block;padding:var(--ep-glyph-pad);font-family:var(--emoji-font-family,${EMOJI_FONT})!important;line-height:100%;font-size:var(--ep-size);text-align:center;letter-spacing:0}
${S("list")}:is([data-results],[data-orientation="horizontal"]) [data-glyph]{padding:0}
:where(${S("root")}) ${S("emoji")} img{box-sizing:content-box!important;width:var(--emoji-image-size,var(--ep-size))!important;height:var(--emoji-image-size,var(--ep-size))!important;min-width:0!important;max-width:none!important;min-height:0!important;max-height:none!important;padding:0!important;margin:auto;display:block;align-self:center;justify-self:center;object-fit:contain}
:where(${S("skinTone")}){position:relative;display:inline-flex}
:where(${S("skinToneOptions")}){position:absolute;inset-block-start:0;inset-inline-end:0;z-index:3;display:flex}
${S("reactions")}{display:flex;align-items:center;justify-content:space-between;margin:0;padding:0 5px;height:100%}
${S("panel")}{display:flex;flex-direction:column;flex:1 1 auto;min-height:0;min-width:0}
${S("panel")}[hidden]{display:none}
${S("empty")},${S("loading")}{display:flex;align-items:center;justify-content:center;padding:var(--ep-pad);min-height:var(--ep-cell)}
${S("headerActions")}{position:absolute;inset:0;pointer-events:none;z-index:3}
:where(${S("variations")}){z-index:4;display:flex;background:var(--emoji-picker-background,Canvas);border-radius:var(--emoji-picker-radius,8px);box-shadow:var(--emoji-picker-shadow,0 4px 12px rgb(0 0 0 / 0.15))}
${S("headerActions")} > *{pointer-events:auto}
}`;

/** Injects the structural stylesheet once per document (and per cascade layer). */
export const useStructureStyles = (layer: string, nonce?: string) => useStyleSheet(`structure-${layer}`, STRUCTURE(layer), nonce);

export const VISUALLY_HIDDEN: React.CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 };
