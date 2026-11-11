import type { EmojiPicker } from "emoji-components";
import { className, rowsOf } from "./rows";

const interaction = "hovered, focused, focusVisible, pressed, disabled";

export const root = rowsOf<EmojiPicker.Root.Props>()([
  {
    name: "onSelect",
    type: '(selection: EmojiSelection, details: { reason: "item-press" | "imperative-action", event, cancel() }) => void',
    description: "Runs when the user selects an emoji. A selection shows the reaction row again; close an enclosing popover here. `details.cancel()` keeps the value and the expanded picker as they are.",
  },
  { name: "columns", type: '"fit" | number', default: '`"fit"`', description: "Emoji per row: as many as fit the width, or exactly this many." },
  {
    name: "categories",
    type: "readonly CategoryOption[]",
    description:
      'The sections in order, each `{ id, name?, icon?, nav? }`. Ids are `"frequent"` (frequently used), a group id such as `"smileys-people"`, `"custom"` (custom emoji without a group), and `"custom:<group>"`. Custom sections that are not listed follow the listed ones.',
  },
  { name: "frequent", type: "number | false | readonly string[]", default: "`16`", description: "How many frequently used emoji to show, or fixed unified codes to show in their place. `false` hides the section." },
  { name: "searchResults", type: '"ranked" | "grouped"', default: '`"ranked"`', description: "Search results in one ranked list, or in their sections." },
  { name: "searchLimit", type: "number", default: "`200`", description: "The most results a search shows." },
  { name: "query", type: "string", description: "The search text. Controlled." },
  { name: "defaultQuery", type: "string" },
  { name: "onQueryChange", type: '(query: string, details: { reason: "input-change" | "clear-press" | "escape-key" | "imperative-action" | "none", event, cancel(), allowPropagation() }) => void' },
  { name: "value", type: "string | null", description: "The selected emoji, for a single-value picker such as a page icon. Compared without skin tone. Controlled." },
  { name: "defaultValue", type: "string | null" },
  { name: "onValueChange", type: '(unified: string | null, details: { reason: "item-press" | "imperative-action", event, cancel() }) => void', description: "Runs with or without `value`; passing only `onValueChange` tracks the value." },
  {
    name: "highlight",
    type: "string | null",
    description: 'The highlighted emoji, shared by keyboard and pointer: a unified code, or an item key such as `"smileys-people:1f600"` for one section. Controlled.',
  },
  { name: "defaultHighlight", type: "string | null" },
  { name: "onHighlightChange", type: '(unified: string | null, details: { reason: "keyboard" | "pointer" | "imperative-action" | "none", key, event, cancel() }) => void', description: "`details.key` is the item key, scoped to a section." },
  { name: "reactions", type: "readonly string[] | number", description: "The unified codes `Reactions` shows. A number shows that many frequently used emoji." },
  { name: "reactionsOpen", type: "boolean", description: "Whether the reaction row shows in place of `Panel`. Controlled." },
  { name: "defaultReactionsOpen", type: "boolean", default: "`true`" },
  {
    name: "onReactionsOpenChange",
    type: '(open: boolean, details: { reason: "trigger-press" | "item-press" | "escape-key" | "none", cancel() }) => void',
    description: '`"item-press"` is a selection in `Panel`, which shows the row again; `details.cancel()` keeps `Panel` open.',
  },
  {
    name: "actionsRef",
    type: "Ref<EmojiPicker.Root.Actions>",
    description: "`move`, `pick`, `highlight`, `focusSearch`, `clearSearch`, `close`, and `toggleSkinTone`. Inside `Root`, `useEmojiPickerHighlight()` and `useEmojiPickerSearch()` return the same actions.",
  },
  {
    name: "keyboardTarget",
    type: "HTMLElement | RefObject<HTMLElement | null> | null",
    description: "An element that keeps focus, such as an editor. Its arrow keys, Page Up, Page Down, and Enter drive the picker, and it gets `aria-activedescendant`.",
  },
  { name: "collapsedCategories", type: "readonly string[]", description: "The ids of collapsed sections. Controlled." },
  { name: "defaultCollapsedCategories", type: "readonly string[]" },
  { name: "onCollapsedCategoriesChange", type: '(ids: readonly string[], details: { reason: "trigger-press" | "none", cancel() }) => void' },
  { name: "emojiVersion", type: "number", description: "Hides emoji added after this Unicode emoji version." },
  { name: "disableVariations", type: "boolean", default: "`false`", description: "Turns off each emoji's skin-tone variations (long press and Shift+Space)." },
  className("{ searching, reactionsOpen }"),
]);

export const search = rowsOf<EmojiPicker.Search.Props>()([
  { name: "children", type: "ReactNode", default: "`SearchInput` and `SearchClear`", description: "`SearchInput`, `SearchClear`, and anything placed beside them, such as an icon." },
  className("{ empty }"),
]);

export const searchInput = rowsOf<EmojiPicker.SearchInput.Props>()([
  { name: "placeholder", type: "string", default: "`labels.searchPlaceholder`" },
  { name: "autoFocus", type: "boolean", default: "`false`", description: "Focuses the field on mount, and marks it for `emojiPickerInitialFocus`." },
  className("{ hovered, focused, focusVisible, disabled }"),
]);

export const searchClear = rowsOf<EmojiPicker.SearchClear.Props>()([{ name: "children", type: "ReactNode | (state) => ReactNode", default: "`×`" }, className(`{ ${interaction} }`)]);

export const searchStatus = rowsOf<EmojiPicker.SearchStatus.Props>()([
  { name: "children", type: "ReactNode | ({ resultCount }) => ReactNode", default: "`labels.resultCount(resultCount)`" },
  className("{ resultCount }", "`resultCount` is `null` while not searching."),
]);

export const skinTone = rowsOf<EmojiPicker.SkinTone.Props>()([
  { name: "orientation", type: '"horizontal" | "vertical"', default: '`"horizontal"`' },
  { name: "open", type: "boolean", description: "Whether the options are open. Controlled." },
  { name: "defaultOpen", type: "boolean", default: "`false`" },
  {
    name: "onOpenChange",
    type: '(open: boolean, details: { reason: "trigger-press" | "outside-press" | "escape-key" | "item-press" | "focus-out" | "imperative-action" | "none", event, trigger, cancel(), allowPropagation() }) => void',
  },
  { name: "children", type: "ReactNode | ({ open, tone }) => ReactNode", default: "`SkinToneTrigger` and `SkinToneOptions`" },
  className("{ open, tone }"),
]);

export const skinToneTrigger = rowsOf<EmojiPicker.SkinToneTrigger.Props>()([{ name: "children", type: "ReactNode | (state) => ReactNode", default: "a swatch of the current tone" }, className(`{ open, tone, ${interaction} }`)]);

export const skinToneOptions = rowsOf<EmojiPicker.SkinToneOptions.Props>()([
  { name: "children", type: "(tone: SkinToneValue) => ReactNode", default: "`<SkinToneOption />`", description: "Called for each tone." },
  className("{ orientation, tone }"),
]);

export const skinToneOption = rowsOf<EmojiPicker.SkinToneOption.Props>()([
  { name: "tone", type: "SkinToneValue", default: "the tone `SkinToneOptions` called its children with", description: "`0` (none) to `5`." },
  { name: "children", type: "ReactNode | (state) => ReactNode", default: "a swatch of the tone" },
  className(`{ tone, selected, ${interaction} }`),
]);

export const skinToneGlyph = rowsOf<EmojiPicker.SkinToneGlyph.Props>()([
  { name: "emoji", type: "string", default: '`"✋"`', description: "Drawn in its `SkinToneOption`'s tone, or in the current tone outside one." },
  { name: "size", type: "number", default: "`1em`", description: "Size in pixels." },
]);

export const viewport = rowsOf<EmojiPicker.Viewport.Props>()([className("{ searching, orientation }")]);

export const list = rowsOf<EmojiPicker.List.Props>()([
  { name: "children", type: "(section: EmojiSection) => ReactNode", default: "each section's title and cells", description: "Called only for the sections in view." },
  { name: "orientation", type: '"vertical" | "horizontal"', default: '`"vertical"`' },
  { name: "rows", type: "number", default: "`5`", description: "Rows per section in a horizontal list." },
  {
    name: "renderEmptyState",
    type: "(state: { status, query, error, retry }) => ReactNode",
    description: 'Shown while the data loads, after it or a search fails, and when nothing matches. `status` is `"loading"`, `"error"`, or `"empty"`; `error` is what failed, and `retry()` loads the data or runs the search again.',
  },
  className("{ orientation, searching, empty }"),
]);

export const listSection = rowsOf<EmojiPicker.ListSection.Props>()([
  { name: "children", type: "ReactNode", description: "`ListSectionTitle`, `ListItems`, and `ListSectionActions`, directly or through components that render them." },
  className("{ section, collapsed }"),
]);

export const listSectionTitle = rowsOf<EmojiPicker.ListSectionTitle.Props>()([{ name: "children", type: "ReactNode | ({ section, collapsed }) => ReactNode", default: "`section.name`" }, className("{ section, collapsed }")]);

export const listSectionActions = rowsOf<EmojiPicker.ListSectionActions.Props>()([
  { name: "children", type: "ReactNode | ({ section, collapsed, toggle, toggleProps }) => ReactNode", description: "Spread `toggleProps` on a button that calls `toggle` to collapse the section." },
  className("{ section, collapsed, toggle, toggleProps }"),
]);

export const listItems = rowsOf<EmojiPicker.ListItems.Props>()([{ name: "children", type: "(emoji: EmojiItem) => ReactNode", default: "`<ListCell />`", description: "Called only for the emoji in view." }]);

export const listCell = rowsOf<EmojiPicker.ListCell.Props>()([
  { name: "children", type: "ReactNode | (state) => ReactNode", default: "the emoji" },
  className("{ emoji, row, column, highlighted, hovered, focused, focusVisible, pressed, selected }"),
]);

export const listVariations = rowsOf<EmojiPicker.ListVariations.Props>()([
  { name: "children", type: "(tone: SkinToneValue) => ReactNode", default: "`<ListVariationsOption />`", description: "Called for each tone." },
  className("{ emoji, tone }"),
]);

export const listVariationsOption = rowsOf<EmojiPicker.ListVariationsOption.Props>()([
  { name: "tone", type: "SkinToneValue", default: "the tone `ListVariations` called its children with" },
  { name: "children", type: "ReactNode | (state) => ReactNode", default: "the emoji in the tone" },
  className(`{ emoji, unified, tone, selected, highlighted, ${interaction} }`),
]);

export const categoryNav = rowsOf<EmojiPicker.CategoryNav.Props>()([
  { name: "orientation", type: '"horizontal" | "vertical"', default: '`"horizontal"`' },
  { name: "children", type: "(category: EmojiPickerNavCategory) => ReactNode", default: "`<CategoryNavTab />`", description: "Called for each section, with its `{ id, name, icon }`." },
  className("{ orientation, disabled }"),
]);

export const categoryNavTab = rowsOf<EmojiPicker.CategoryNavTab.Props>()([
  { name: "children", type: "ReactNode | (state) => ReactNode", default: "the section's icon, or `<CategoryNavIcon />`" },
  className("{ category, active, focused, focusVisible, hovered, pressed, disabled }", "`active` is the tab for the section in view, while not searching."),
]);

export const categoryNavIcon = rowsOf<EmojiPicker.CategoryNavIcon.Props>()([{ name: "category", type: "string", default: "its `CategoryNavTab`'s section", description: "The section id whose built-in icon to draw." }]);

export const preview = rowsOf<EmojiPicker.Preview.Props>()([
  {
    name: "children",
    type: "ReactNode | ({ emoji, unified }) => ReactNode",
    default: "the emoji and its name, or `labels.previewCaption`",
    description: "`emoji` is the highlighted `EmojiRecord`, or `null`, and `unified` its code points with the skin tone the cell shows.",
  },
  className("{ emoji }"),
]);

export const reactions = rowsOf<EmojiPicker.Reactions.Props>()([
  {
    name: "value",
    type: "readonly string[]",
    description: "The user's reactions. With `value`, `defaultValue`, or `onValueChange`, items are toggle buttons, pressed when their emoji is listed in any skin tone. Controlled.",
  },
  { name: "defaultValue", type: "readonly string[]" },
  {
    name: "onValueChange",
    type: '(value: readonly string[], details: { reason: "item-press", emoji, pressed, event, cancel() }) => void',
    description: "`details.pressed` is whether the press added the reaction. Only an added reaction calls `onSelect`.",
  },
  { name: "children", type: "ReactNode | (emoji: string) => ReactNode", default: "`ReactionsItems`, then `ReactionsExpand`", description: "Each reaction, or the row's parts." },
  className("{ orientation }"),
]);

export const reactionsItems = rowsOf<EmojiPicker.ReactionsItems.Props>()([{ name: "children", type: "(emoji: string) => ReactNode", default: "`<ReactionsItem />`", description: "Called for each reaction." }]);

export const reactionsItem = rowsOf<EmojiPicker.ReactionsItem.Props>()([{ name: "emoji", type: "string", description: "The unified code." }, className(`{ selected, ${interaction} }`)]);

export const reactionsExpand = rowsOf<EmojiPicker.ReactionsExpand.Props>()([{ name: "children", type: "ReactNode | (state) => ReactNode", default: "a plus" }, className(`{ ${interaction} }`)]);

export const panel = rowsOf<EmojiPicker.Panel.Props>()([{ name: "children", type: "ReactNode | ({ hidden }) => ReactNode", description: "The full picker." }, className("{ hidden }")]);
