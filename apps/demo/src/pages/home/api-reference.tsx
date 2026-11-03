// API reference, Base UI style: one block per part with props, data attributes
// and CSS variables. Names and defaults follow packages/emoji-picker/src.
import * as React from "react";
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
  { name: "keepSearchFocus", type: "boolean", description: "Keeps focus in search while arrow keys move the highlight." },
  { name: "disableVariations", type: "boolean", description: "Disables skin-tone variations in the grid." },
  { name: "components", type: "PickerComponents", description: "{ CategoryButton, SkinToneButton, ClearButton, ExpandButton }" },
  { name: "colorScheme", type: '"light" | "dark" | "auto"', description: "Applies the built-in color tokens." },
  { name: "cssLayer", type: "string", default: '"base"', description: "Cascade layer for the built-in CSS." },
  { name: "nonce", type: "string" },
];

const SEARCH: PropRow[] = [
  { name: "inputProps", type: "InputHTMLAttributes", description: "Props for the input element." },
  { name: "inputRef", type: "Ref<HTMLInputElement>" },
  { name: "children", type: "ReactNode", description: "Rendered after the input." },
];

const SEARCH_INPUT: PropRow[] = [{ name: "as", type: "ElementType", default: '"input"', description: "The input component to render." }];

const NAV: PropRow[] = [
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "tabClassName", type: "string", description: "Classes for each tab." },
];

const LIST: PropRow[] = [
  { name: "components", type: "{ Emoji?, CategoryHeader? }", description: "Custom cell and section title components." },
  { name: "cellClassName", type: "string", description: "Classes for each emoji cell." },
  { name: "headerClassName", type: "string", description: "Classes for each section title." },
];

const SKIN_TONE: PropRow[] = [
  { name: "emoji", type: "string", description: "Shows options as this emoji in each tone instead of swatches." },
  { name: "buttonClassName", type: "string", description: "Classes for the trigger and each option." },
  { name: "orientation", type: '"horizontal" | "vertical"', default: '"horizontal"' },
  { name: "optionsClassName", type: "string" },
  { name: "button", type: "ComponentType<SkinToneButtonProps>" },
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
  { name: "reactionsClassName", type: "string" },
  { name: "children", type: "ReactNode", description: "Parts of the expanded picker. Accepts Root props." },
];

const POPOVER_ROOT: PropRow[] = [
  { name: "open", type: "boolean" },
  { name: "defaultOpen", type: "boolean", default: "false" },
  { name: "onOpenChange", type: "(open: boolean) => void" },
  { name: "closeOnSelect", type: "boolean", default: "true", description: "Closes when a picker inside selects an emoji." },
];
const POPOVER_TRIGGER: PropRow[] = [{ name: "asChild", type: "boolean", description: "Merges props onto the child element." }];
const POPOVER_CONTENT: PropRow[] = [
  { name: "side", type: '"top" | "bottom"', default: '"bottom"', description: "Flips when there isn't room." },
  { name: "align", type: '"start" | "center" | "end"', default: '"start"' },
  { name: "sideOffset", type: "number", default: "8" },
  { name: "collisionPadding", type: "number", default: "8" },
  { name: "container", type: "HTMLElement | false", default: "document.body", description: "Portal target. false renders in place." },
  { name: "anchor", type: "Element | VirtualElement | () => …", description: "Positions against this element instead of the Trigger." },
];

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
  ['data-slot="skin-tone" · "skin-tone-option" · "skin-tone-options"', "Skin tone trigger, options and their list"],
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

      <Part id="api-root" title="Root" description="Contains the parts of a picker." props={ROOT} />

      <Part id="api-search" title="Search and SearchInput" description="The search field. SearchInput renders only the input." props={SEARCH}>
        <PropsTable rows={SEARCH_INPUT} />
      </Part>

      <Part id="api-category-nav" title="CategoryNav" description="A tab for each section that scrolls the list to it." props={NAV} />

      <Part id="api-list" title="Viewport and List" description="The scroll container and the virtualized emoji grid." props={LIST} />

      <Part id="api-skin-tone" title="SkinTone" description="A button that shows the current skin tone and opens the options." props={SKIN_TONE} />

      <Part id="api-states" title="Empty, Loading, LoadError" description="Content for the empty, loading and error states." props={STATES} />

      <Part id="api-tapback" title="Tapback" description="A row of the most-used emoji that expands into a picker." props={TAPBACK} />

      <Part id="api-popover" title="EmojiPopover" description="A popover that positions a picker next to its trigger." props={POPOVER_ROOT}>
        <Sub>Trigger</Sub>
        <PropsTable rows={POPOVER_TRIGGER} />
        <Sub>Content</Sub>
        <PropsTable rows={POPOVER_CONTENT} />
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
