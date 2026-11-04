// API reference, Base UI style: one block per part with props, data attributes
// and CSS variables. Names and defaults follow packages/emoji-picker/src.
import * as React from "react";
import { Code } from "@/components/site/code";
import { AttrTable, C, H2, H3, P, PropsTable, type PropRow } from "@/components/site/docs";

function Part({ id, title, description, props, children }: { id: string; title: string; description: React.ReactNode; props?: PropRow[]; children?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <H3 id={id}>{title}</H3>
      <P className="-mt-1">{description}</P>
      {props ? <PropsTable rows={props} /> : null}
      {children}
    </section>
  );
}

function Sub({ children }: { children: React.ReactNode }) {
  return <h4 className="mt-2 text-[13px] font-medium text-muted-foreground">{children}</h4>;
}

const PROVIDER: PropRow[] = [
  { name: "data", type: "Dataset | string | (({ signal }) => Promise<Dataset>)", description: "A URL, a loader or a dataset object." },
  { name: "customEmojis", type: "CustomEmoji[]", description: "{ id, name, imageUrl, shortcodes?, tags?, group? }" },
  { name: "filter", type: "(record: EmojiRecord) => boolean", description: "Excludes emoji from the picker and search." },
  { name: "search", type: "EmojiSearch", default: "lexical()", description: "(query, context) => hits | Promise<hits>" },
  { name: "renderer", type: '"auto" | "native" | "twemoji"', default: '"auto"' },
  { name: "twemojiBaseUrl", type: "string", default: "jsDelivr (pinned)" },
  { name: "frequents", type: "FrequencyStore", default: "localStorage", description: "createFrequencyStore({ storage })" },
  { name: "defaultSkinTone", type: "number", default: "0", description: "1–5 are the Fitzpatrick tones." },
  { name: "prepare", type: "boolean", default: "true", description: "Loads data and builds the index when idle." },
  { name: "labels", type: "{ suggested?: string; custom?: string }", default: '"Frequently used", "Custom"' },
];

const ROOT: PropRow[] = [
  { name: "onSelect", type: "(selection: EmojiSelection, details: SelectDetails) => void" },
  { name: "columns", type: "number", default: "fits width", description: "Emoji per row." },
  { name: "categories", type: "CategoryOption[]", description: "The sections to show, in order." },
  { name: "frequent", type: "number | false", default: "16", description: "Number of frequently used emoji. false hides the section." },
  { name: "suggested", type: "string[]", description: "Fixed emoji for the suggested section." },
  { name: "searchResults", type: '"ranked" | "grouped"', default: '"ranked"' },
  { name: "searchLimit", type: "number", default: "200" },
  { name: "searchPlaceholder", type: "string", default: '"Search"' },
  { name: "search", type: "string", description: "Controlled search text." },
  { name: "defaultSearch", type: "string" },
  { name: "onSearchChange", type: "(value: string) => void" },
  { name: "autoFocusSearch", type: "boolean" },
  { name: "focusModel", type: '"input" | "grid"', default: '"input"', description: "Where focus lives while navigating: the search field, or the cells." },
  { name: "pointer", type: '"follows" | "independent"', default: '"follows"', description: "Whether hover moves the keyboard position." },
  { name: "keymap", type: "Partial<Record<KeyboardAction, string[]>>", description: "Keys per action, replacing the defaults." },
  { name: "onKeyDown", type: "PickerKeyboardEventHandler", description: "Runs before the picker handles a key." },
  { name: "collapsedCategories", type: "string[]", description: "Collapsed sections, controlled." },
  { name: "defaultCollapsedCategories", type: "string[]" },
  { name: "onCollapsedCategoriesChange", type: "(ids: string[]) => void" },
  { name: "artwork", type: "ArtworkMap", description: "Draws these emoji with your own art." },
  { name: "emojiVersion", type: "number", description: "Hides emoji added after this Unicode emoji version." },
  { name: "disableVariations", type: "boolean", description: "Disables skin-tone variations in the grid." },
  { name: "colorScheme", type: '"light" | "dark" | "auto"', description: "Applies the built-in color tokens." },
  { name: "cssLayer", type: "string", default: '"base"', description: "Cascade layer for the built-in CSS." },
  { name: "nonce", type: "string" },
];

const PART: PropRow[] = [
  { name: "render", type: "ReactElement | (props, state) => ReactElement", description: "Replaces the element: its props and ref merge with the part's." },
  { name: "className", type: "string | (state) => string", description: "A function receives the part's state." },
  { name: "style", type: "CSSProperties | (state) => CSSProperties" },
];

const SEARCH: PropRow[] = [{ name: "children", type: "ReactNode", default: "<Search.Input />", description: "The row's contents." }];

const SEARCH_INPUT: PropRow[] = [
  { name: "placeholder", type: "string", default: "Root's searchPlaceholder" },
  { name: "autoFocus", type: "boolean", default: "Root's autoFocusSearch" },
  { name: "children", type: "ReactNode", default: "<Search.Clear />", description: "In the field, after the input." },
];

const NAV: PropRow[] = [
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "children", type: "(category) => ReactNode", default: "<CategoryNav.Tab />", description: "Each section's tab: { id, name, icon }." },
];

const NAV_TAB: PropRow[] = [{ name: "className", type: "string | ({ selected, active, focusVisible, hovered, pressed, disabled }) => string" }];

const LIST: PropRow[] = [
  { name: "children", type: "(section) => ReactNode", default: "title and cells", description: "Called only for the sections in view." },
  { name: "orientation", type: '"vertical" | "horizontal"', default: '"vertical"' },
  { name: "rows", type: "number", default: "5", description: "Horizontal only: rows per section." },
  { name: "searchRows", type: "number", default: "rows", description: "Horizontal only: rows while search results show." },
  { name: "value", type: "string | null", description: "A value picker: the emoji shown as chosen (aria-selected)." },
];

const LIST_PARTS: PropRow[] = [
  { name: "List.Section", type: "{ section, collapsed }", description: "A section (group): List.SectionTitle, List.Items, List.SectionActions." },
  { name: "List.SectionTitle", type: "{ section, collapsed }", default: "section.name", description: "Text in the listbox, sticky where the layout puts it." },
  { name: "List.Items › children", type: "(emoji: EmojiItem) => ReactNode", default: "<List.Cell />", description: "Called only for the emoji in view." },
  { name: "List.Cell", type: "{ emoji, highlighted, active, hovered, focused, focusVisible, pressed, selected }", default: "the glyph", description: "An option; re-renders only when its own state changes." },
  { name: "List.SectionActions", type: "{ section, collapsed, toggle, toggleProps }", description: "Controls over the title, outside the listbox." },
];

const SKIN_TONE: PropRow[] = [
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "children", type: "ReactNode", default: "Trigger, Options", description: "State: { open, tone }." },
  { name: "Trigger › children", type: "ReactNode | (state) => ReactNode", default: "a swatch" },
  { name: "Options › children", type: "(tone: number) => ReactNode", default: "<SkinTone.Option />" },
  { name: "Option › tone", type: "0–5", description: "State: { tone, selected }." },
  { name: "Glyph › emoji", type: "string", default: '"✋"', description: "In the tone of its Option, else the current one." },
];

const STATES: PropRow[] = [
  { name: "Empty › children", type: "ReactNode | ({ search }) => ReactNode", description: "Shown when a search has no results." },
  { name: "LoadError › children", type: "ReactNode | ({ error, retry }) => ReactNode" },
  { name: "Loading › children", type: "ReactNode" },
];

const TAPBACK: PropRow[] = [
  { name: "onSelect", type: "(selection: EmojiSelection) => void" },
  { name: "count", type: "number", default: "5", description: "Number of emoji in the row." },
  { name: "collapseOnSelect", type: "boolean", default: "true" },
  { name: "expandable", type: "boolean", default: "true", description: "Shows the expand button." },
  { name: "selected", type: "string[]", description: "The user's reactions: toggle buttons, pressed." },
  { name: "children", type: "ReactNode", default: "<Reactions />", description: "Reactions, and a Panel with the expanded picker. Accepts Root props." },
];

const REACTIONS: PropRow[] = [
  { name: "children", type: "(emoji) => ReactNode | ReactNode", default: "Items, then Expand", description: "Each reaction, or Reactions.Items and Reactions.Expand." },
  { name: "Item › emoji", type: "string", description: "Unified code. State: React Aria's button state, with isSelected." },
  { name: "Expand › children", type: "ReactNode", default: "a plus" },
];

const POPOVER_ROOT: PropRow[] = [
  { name: "open", type: "boolean" },
  { name: "defaultOpen", type: "boolean", default: "false" },
  { name: "onOpenChange", type: "(open: boolean) => void" },
  { name: "closeOnSelect", type: "boolean", default: "true", description: "Closes when a picker inside selects an emoji." },
];
const POPOVER_TRIGGER: PropRow[] = [{ name: "render", type: "ReactElement", description: "Merges props onto this element." }];
const POPOVER_CONTENT: PropRow[] = [
  { name: "side", type: '"top" | "bottom"', default: '"bottom"', description: "Flips when there isn't room." },
  { name: "align", type: '"start" | "center" | "end"', default: '"start"' },
  { name: "sideOffset", type: "number", default: "8" },
  { name: "collisionPadding", type: "number", default: "8" },
  { name: "container", type: "HTMLElement | false", default: "document.body", description: "Portal target. false renders in place." },
  { name: "anchor", type: "Element | VirtualElement | () => …", description: "Positions against this element instead of the Trigger." },
  { name: "finalFocus", type: "HTMLElement | RefObject | () => HTMLElement", default: "the Trigger", description: "Focused once a pick closes the content." },
  { name: "duration", type: "number", default: "0", description: "Floating UI only: ms the content stays mounted with data-ending-style after closing." },
];

const POPOVER_ADAPTERS = `import { EmojiPopover, EmojiSuggestions } from "@brianhung/emoji-picker/floating-ui"; // the default
import { EmojiPopover, EmojiSuggestions } from "@brianhung/emoji-picker/react-aria";`;

const OWN_POPOVER = `import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EmojiPicker, pickerInitialFocus } from "@brianhung/emoji-picker";

<Popover open={open} onOpenChange={setOpen}>
  <PopoverTrigger>😀</PopoverTrigger>
  <PopoverContent initialFocus={() => pickerInitialFocus(document.querySelector("[data-slot=emoji-picker]"))}>
    <EmojiPicker.Root onSelect={({ emoji }) => { insert(emoji); setOpen(false); }}>…</EmojiPicker.Root>
  </PopoverContent>
</Popover>`;

const EMOJI: PropRow[] = [
  { name: "unified", type: "string", description: "Unified code or custom emoji id." },
  { name: "size", type: "number", description: "Image size in pixels." },
];

const SLOTS: [string, string][] = [
  ['data-slot="emoji-picker"', "Root"],
  ['data-slot="search" · "search-input" · "search-clear"', "Search row, its input and clear button"],
  ['data-slot="category-nav" · "category-tab"', "Category bar and each tab"],
  ['data-slot="viewport" · "list"', "Scroll container and the virtualized list"],
  ['data-slot="category-header" · "emoji"', "Section titles and cells"],
  ['data-slot="skin-tone" · "skin-tone-trigger" · "skin-tone-options" · "skin-tone-option"', "Skin tone, its trigger, the options and each option"],
  ['data-slot="reactions" · "reactions-expand" · "panel"', "Tapback row, its “+”, and the expanded picker"],
  ['data-slot="preview" · "empty" · "loading"', "Preview, no results, loading"],
];

const STATE_ATTRS: [string, string][] = [
  ["data-highlighted", "Present on the highlighted cell."],
  ["data-active", "Present on the category tab for the section in view."],
  ["data-has-variations", "Present on cells with skin-tone variations."],
  ["data-unified", "The cell's unified code."],
  ['data-state="open" | "closed"', "Present on SkinTone. Whether the options are open."],
  ['data-orientation', "SkinTone options: horizontal or vertical."],
];

const SIZE_VARS: [string, string, string][] = [
  ["--emoji-size", "30px", "Emoji size."],
  ["--emoji-cell-size", "size + 10px", "Cell size."],
  ["--emoji-image-size", "--emoji-size", "Image emoji size."],
  ["--emoji-list-padding", "10px", "Horizontal padding of the grid."],
  ["--emoji-header-height", "40px", "Section title height."],
  ["--emoji-skin-tone-size", "15px", "Skin tone swatch size."],
];

const TOKENS: [string, string, string][] = [
  ["--emoji-picker-background", "#fff / #171717", "Surface (bg-picker-background)."],
  ["--emoji-picker-foreground", "#171717 / #fafafa", "Text."],
  ["--emoji-picker-muted", "#737373 / #a3a3a3", "Section titles, secondary text."],
  ["--emoji-picker-subtle", "#a3a3a3 / #737373", "Placeholders, icons."],
  ["--emoji-picker-border", "#e5e5e5 / #2e2e2e", "Dividers and outline."],
  ["--emoji-picker-input", "#f5f5f5 / #262626", "Search field."],
  ["--emoji-picker-input-border", "#d4d4d4 / #404040", "Search field border."],
  ["--emoji-picker-panel", "#f5f5f5 / #262626", "Footers, side rails."],
  ["--emoji-picker-hover", "#f0f0f0 / #2a2a2a", "Hovered cell or tab."],
  ["--emoji-picker-selected", "#ebebeb / #333333", "Highlighted cell, active tab."],
  ["--emoji-picker-accent", "#171717 / #fafafa", "Active indicators."],
  ["--emoji-picker-ring", "#a3a3a3 / #737373", "Focus ring."],
  ["--emoji-picker-radius", "10px", "rounded-picker"],
  ["--emoji-picker-shadow", "shadow-lg", "shadow-picker"],
  ["--emoji-picker-font", "--font-sans", "font-picker"],
];

export function ApiReference() {
  return (
    <section className="flex flex-col gap-12">
      <div className="flex flex-col gap-3">
        <H2 id="api-reference">API reference</H2>
        <P>
          Each part forwards its ref and spreads other props onto its element.
        </P>
      </div>

      <Part id="api-provider" title="EmojiProvider" description="Provides the dataset, search, frequently used emoji and skin tone to the parts and hooks inside it." props={PROVIDER} />

      <Part id="api-parts" title="Every part" description="Each part renders its default element and children; these props replace or style them. State is also on data attributes." props={PART} />

      <Part id="api-root" title="Root" description="Contains the parts of a picker." props={ROOT} />

      <Part id="api-search" title="Search" description="The search row. Search.Input is the field; Search.Clear clears it, shown only with a query." props={SEARCH}>
        <Sub>Search.Input</Sub>
        <PropsTable rows={SEARCH_INPUT} />
      </Part>

      <Part id="api-category-nav" title="CategoryNav" description="A tab for each section that scrolls the list to it." props={NAV}>
        <Sub>CategoryNav.Tab</Sub>
        <PropsTable rows={NAV_TAB} />
      </Part>

      <Part id="api-list" title="Viewport and List" description="The scroll container and the virtualized emoji grid." props={LIST}>
        <Sub>Parts and their state</Sub>
        <PropsTable rows={LIST_PARTS} />
      </Part>

      <Part id="api-skin-tone" title="SkinTone" description="The shared skin tone: a trigger, and the six tones it opens as a radio group." props={SKIN_TONE} />

      <Part id="api-states" title="Empty, Loading, LoadError" description="Content for the empty, loading and error states." props={STATES} />

      <Part id="api-tapback" title="Tapback" description="A row of the most-used emoji that expands into a picker." props={TAPBACK}>
        <Sub>Reactions</Sub>
        <PropsTable rows={REACTIONS} />
      </Part>

      <Part id="api-popover" title="EmojiPopover" description="A popover that positions a picker next to its trigger." props={POPOVER_ROOT}>
        <Sub>Trigger</Sub>
        <PropsTable rows={POPOVER_TRIGGER} />
        <Sub>Content</Sub>
        <PropsTable rows={POPOVER_CONTENT} />
        <Sub>Floating UI or React Aria</Sub>
        <P>
          The root export is built on Floating UI. The same <C>EmojiPopover</C> and <C>EmojiSuggestions.Popover</C> (a <C>:shortcode</C> menu at a text field's caret that never takes focus) also come from either subpath; an app bundles only the one it imports.
          React Aria's popover is modal: focus stays inside and the page doesn't scroll until it closes. Its non-modal popover closes when the page scrolls and stays open on a press outside, so editor menus should use the Floating UI <C>EmojiSuggestions.Popover</C>.
        </P>
        <Code title="imports.tsx" lang="tsx">{POPOVER_ADAPTERS}</Code>
        <Sub>Your own popover</Sub>
        <P>
          A picker works in any popover. In Base UI or shadcn/ui, close it from <C>onSelect</C> and focus the picker with <C>pickerInitialFocus</C>.
        </P>
        <Code title="emoji-button.tsx" lang="tsx">{OWN_POPOVER}</Code>
      </Part>

      <Part id="api-emoji" title="Emoji" description="Renders a single emoji as the pickers do." props={EMOJI} />

      <Part id="api-data-attributes" title="Data attributes" description="Each part has a data-slot attribute. State is exposed as data attributes.">
        <AttrTable head={["Slot", "Part"]} rows={SLOTS.map(([a, b]) => [a, b])} />
        <AttrTable head={["Attribute", "Description"]} rows={STATE_ATTRS.map(([a, b]) => [a, b])} />
      </Part>

      <Part
        id="api-css-variables"
        title="CSS variables"
        description={
          <>
            Set sizes on Root or an ancestor. Colors are defined in <C>tokens.css</C>.
          </>
        }
      >
        <AttrTable head={["Variable", "Default", "Description"]} rows={SIZE_VARS.map((r) => [...r])} />
        <AttrTable head={["Token", "Default (light / dark)", "Description"]} rows={TOKENS.map((r) => [...r])} />
      </Part>
    </section>
  );
}
