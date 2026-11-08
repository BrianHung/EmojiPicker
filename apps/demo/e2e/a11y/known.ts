type Known = { rule: string; node: RegExp };

// axe truncates attribute values to ~20 characters, so slot names match by prefix.

const codeToken = /^<span style="color:/;

const KNOWN: Known[] = [
  { rule: "landmark-unique", node: /^<aside data-slot="emoji-picker"/ },

  { rule: "color-contrast", node: /^<header [^>]*text-picker-muted[^>]*data-slot="emoji-picker-section/ },
  { rule: "color-contrast", node: /^<div data-section="\w+"[^>]*text-picker-muted/ },
  { rule: "color-contrast", node: /text-picker-subtle">Remove</ },
  { rule: "color-contrast", node: /style="color: rgb\(125, 122, 117\);">(Team space|Edited just now)</ },
  { rule: "color-contrast", node: /text-\[#868686\]">Type :tad or :smi</ },
  { rule: "color-contrast", node: /^<span class="ml-auto truncate pl-3 [^"]*(opacity-55|text-muted-foreground)"/ },
  { rule: "color-contrast", node: /^<(mark data-active="true"|span class="truncate">:<mark)/ },
  { rule: "color-contrast", node: codeToken },
  { rule: "scrollable-region-focusable", node: /^<div class="overflow-x-auto font-mono/ },
  { rule: "scrollable-region-focusable", node: /^<div data-slot="table-container"/ },
  { rule: "scrollable-region-focusable", node: /^<div id="[^"]*-listbox" role="listbox"/ },
  { rule: "aria-input-field-name", node: /^<div contenteditable="true" role="textbox"[^>]*class="tiptap/ },
  { rule: "label-content-name-mismatch", node: /^<div data-slot="emoji-picker-categor/ },
  { rule: "label-content-name-mismatch", node: /^<button[^>]*aria-label="Open emoji picker"[^>]*data-slot="emoji-popover/ },
  { rule: "heading-order", node: /^<h4 class="pt-0\.5 font-medium">/ },
  { rule: "heading-order", node: /^<h3 class="text-\[16px\] leading-\[22px\]"><span class="font-medium"/ },
  { rule: "heading-order", node: /^<h3>Packing list<\/h3>/ },
  { rule: "nested-interactive", node: /^<div role="button"[^>]*aria-haspopup="dialog"/ },
  { rule: "target-size", node: /^<button type="button" aria-label="[^"]* reaction, tap/ },
];

export const isKnown = (rule: string, selector: string, html: string) => KNOWN.some((k) => k.rule === rule && (k.node.test(html) || k.node.test(selector)));
