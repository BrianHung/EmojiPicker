import type * as React from "react";

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
  skinToneTrigger: "skin-tone-trigger",
  reactions: "reactions",
  reactionsExpand: "reactions-expand",
  preview: "preview",
  panel: "panel",
  empty: "empty",
  loading: "loading",
  loadError: "load-error",
  variations: "variations",
} as const;

export const VISUALLY_HIDDEN: React.CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 };
