// Known axe violations, each keyed by rule id + a pattern on the node's markup (axe's `html`) or
// selector. Every entry is a bug to fix, not a baseline: anything not listed fails the suite, so a
// new violation (or a known rule on a new element) is caught. Delete an entry once its fix lands.
type Known = { rule: string; node: RegExp };

const codeToken = /^<span style="color:/; // syntax-highlighted code on the docs pages

export const KNOWN: Known[] = [
  /* ---------------------------------------------------------- packages/emoji-picker */
  // Every picker root is an unnamed <aside>; pages with several pickers repeat the landmark.
  { rule: "landmark-unique", node: /^<aside data-slot="emoji-picker"/ },

  /* ---------------------------------------------------------- apps/demo (styles and scenes) */
  // Muted greys copied from the real apps for pixel parity, below 4.5:1.
  { rule: "color-contrast", node: /^<header [^>]*text-picker-muted[^>]*data-slot="category-header"/ }, // Notion section labels
  { rule: "color-contrast", node: /^<div data-section="\w+"[^>]*text-picker-muted/ }, // Notion ":" menu section labels
  { rule: "color-contrast", node: /text-picker-subtle">Remove</ }, // Notion picker "Remove"
  { rule: "color-contrast", node: /style="color: rgb\(125, 122, 117\);">(Team space|Edited just now)</ }, // Notion scene chrome
  { rule: "color-contrast", node: /text-\[#868686\]">Type :tad or :smi</ }, // Slack scene hint
  { rule: "color-contrast", node: /^<span class="ml-auto truncate pl-3 [^"]*(opacity-55|text-muted-foreground)"/ }, // autocomplete row's emoji name
  { rule: "color-contrast", node: /^<(mark data-active="true"|span class="truncate">:<mark)/ }, // autocomplete match highlight (Apple)
  { rule: "color-contrast", node: codeToken }, // code blocks' punctuation tokens (dark theme mostly)
  // Code blocks, and the docs' tables at phone width, scroll horizontally but aren't focusable.
  { rule: "scrollable-region-focusable", node: /^<div class="overflow-x-auto font-mono/ },
  { rule: "scrollable-region-focusable", node: /^<div data-slot="table-container"/ },
  // Notion ":" menu: a scrolling listbox driven by aria-activedescendant from the editor; it has no name.
  { rule: "scrollable-region-focusable", node: /^<div id="[^"]*-listbox" role="listbox"/ },
  { rule: "aria-input-field-name", node: /^<(div|ul) id="[^"]*-listbox" role="listbox"/ }, // Notion and Tiptap ":" menus
  { rule: "aria-input-field-name", node: /^<div contenteditable="true" role="textbox"[^>]*class="tiptap/ }, // Tiptap editor
  // Slack and Linear composers: <textarea role="combobox">.
  { rule: "aria-allowed-role", node: /^<textarea role="combobox"/ },
  // Apple category tabs: the visible glyph isn't in the accessible name.
  { rule: "label-content-name-mismatch", node: /^<div data-slot="category-tab"/ },
  // Home "Popover" example: the trigger shows an emoji and text that its aria-label doesn't contain.
  { rule: "label-content-name-mismatch", node: /^<button[^>]*aria-label="Open emoji picker"[^>]*data-slot="popover-trigger"/ },
  // Headings that skip a level: home install steps (h4), Discord message author (h3), Notion page body (h3).
  { rule: "heading-order", node: /^<h4 class="pt-0\.5 font-medium">/ },
  { rule: "heading-order", node: /^<h3 class="text-\[16px\] leading-\[22px\]"><span class="font-medium"/ },
  { rule: "heading-order", node: /^<h3>Packing list<\/h3>/ },
  // Lexical's typeahead mounts an empty listbox outside the landmarks.
  { rule: "region", node: /^<div aria-label="Typeahead menu" role="listbox"/ },
  // Instagram scene at phone width: the message bubble (role=button) contains the reaction pill
  // button, and the pill is under 24×24.
  { rule: "nested-interactive", node: /^<div role="button"[^>]*aria-haspopup="dialog"/ },
  { rule: "target-size", node: /^<button type="button" aria-label="[^"]* reaction, tap/ },
];

export const isKnown = (rule: string, selector: string, html: string) => KNOWN.some((k) => k.rule === rule && (k.node.test(html) || k.node.test(selector)));
