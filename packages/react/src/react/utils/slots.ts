import type * as React from "react";

export const SLOTS = {
  root: "emoji-picker",
  search: "emoji-picker-search",
  searchField: "emoji-picker-search-field",
  searchInput: "emoji-picker-search-input",
  searchClear: "emoji-picker-search-clear",
  searchStatus: "emoji-picker-search-status",
  categoryNav: "emoji-picker-category-nav",
  categoryTab: "emoji-picker-category-tab",
  viewport: "emoji-picker-viewport",
  list: "emoji-picker-list",
  section: "emoji-picker-section",
  sectionTitle: "emoji-picker-section-title",
  sectionActions: "emoji-picker-section-actions",
  emoji: "emoji-picker-emoji",
  skinTone: "emoji-picker-skin-tone",
  skinToneOption: "emoji-picker-skin-tone-option",
  skinToneOptions: "emoji-picker-skin-tone-options",
  skinToneTrigger: "emoji-picker-skin-tone-trigger",
  reactions: "emoji-picker-reactions",
  reactionsExpand: "emoji-picker-reactions-expand",
  preview: "emoji-picker-preview",
  panel: "emoji-picker-panel",
  variations: "emoji-picker-variations",
  variation: "emoji-picker-variation",
  popoverTrigger: "emoji-picker-popover-trigger",
  popoverContent: "emoji-picker-popover-content",
  suggestions: "emoji-picker-suggestions-popover",
} as const;

export const VISUALLY_HIDDEN: React.CSSProperties = { position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0 0 0 0)", clipPath: "inset(50%)", whiteSpace: "nowrap", border: 0 };
