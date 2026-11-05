# @brianhung/emoji-picker-react

Unstyled React components for emoji pickers, reactions, and shortcode autocomplete, built on [React Aria](https://react-spectrum.adobe.com/react-aria/).

## Installation

### shadcn/ui

```bash
npx shadcn@latest add https://emoji.brianhung.me/r/emoji-picker.json
```

```tsx
import { EmojiPickerCard } from "@/components/ui/emoji-picker";

<EmojiPickerCard onSelect={(selection) => insert(selection.emoji)} />
```

The item also adds `EmojiTapback`, `EmojiPickerBody`, and `EmojiPickerFooter`. For `EmojiPickerPopover` in your `components/ui/popover`, add `emoji-picker-popover.json` (Base UI and Radix bases) or `emoji-picker-popover-aria.json` (`--base aria`).

### npm

```bash
npm i @brianhung/emoji-picker-react
```

`@brianhung/emoji-picker-core` is a dependency; there is nothing else to install.

```tsx
import { EmojiPicker } from "@brianhung/emoji-picker-react";

<EmojiPicker.Root onSelect={(selection) => insert(selection.emoji)}>
  <EmojiPicker.Search>
    <EmojiPicker.Search.Input />
    <EmojiPicker.SkinTone />
  </EmojiPicker.Search>
  <EmojiPicker.Viewport>
    <EmojiPicker.List renderEmptyState={({ status }) => status === "empty" && "No emoji found."} />
  </EmojiPicker.Viewport>
</EmojiPicker.Root>
```

Core ships the English dataset, and `Root` loads it from jsDelivr, pinned to the installed core version. `@brianhung/emoji-picker-data` holds every other locale.

### Shared provider

`Root` uses the nearest `EmojiProvider` and creates its own only when there is none. Hoist one provider to share data, locale, custom emoji, skin tone, and frequently used emoji across every picker, reaction row, and typeahead below it.

```tsx
import { EmojiProvider } from "@brianhung/emoji-picker-react";

<EmojiProvider data="/emoji/ja.json" locale="ja" customEmojis={pack}>
  <App />
</EmojiProvider>
```

## Entry points

| Import | Contents |
|---|---|
| `@brianhung/emoji-picker-react` | Components, hooks, and common core types |
| `/floating-ui`, `/react-aria` | `EmojiPopover`, `EmojiSuggestions.Popover`, `pickerInitialFocus`; `@floating-ui/react` is an optional peer |
| `/tokens.css`, `/theme.css`, `/shadcn.css` | Design tokens, Tailwind v4 utilities, shadcn/ui theme bridge |
| `@brianhung/emoji-picker-core` | Data, search, stores, and every public type, without React ([README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/core#readme)) |

Parts need no CSS. To style with Tailwind, import `tokens.css` (colors, radius, shadow, fonts) and `theme.css` (utilities such as `bg-picker-background`); in a shadcn/ui project, add `shadcn.css` after them to take the colors from your theme.

## Parts

```
Root
├ Search        Search.Input, Search.Clear
├ SkinTone      SkinTone.Trigger, SkinTone.Options {(tone) => SkinTone.Option}, SkinTone.Glyph
├ CategoryNav   {(category) => CategoryNav.Tab}
├ Viewport
│ └ List        {(section) => List.Section}, renderEmptyState
│   └ Section   List.SectionTitle, List.Items {(emoji) => List.Cell}, List.SectionActions
├ Preview       {({ emoji }) => …}
├ Reactions     {(emoji) => Reactions.Item}, or Reactions.Items and Reactions.Expand
└ Panel
```

Each part renders a default when it has no children, and takes `render` (an element or `(props, state) => element`), `className`, and `style` (values or functions of state). Parts are also exported individually (`EmojiPickerRoot`, `EmojiPickerList`, …). Types live on each part, as in Base UI: `EmojiPicker.Root.Props`, `EmojiPicker.Root.State`, `EmojiPicker.Root.Actions`, `EmojiPicker.List.Cell.State`, and so on; the flat names (`RootProps`, `CellState`) are kept. Hooks inside `Root`: `useActiveEmoji`, `useCategoryNavigation`, `useCollapsedCategories`, `useEmojiPickerActions`, `useSearchState`.

| `Root` prop | Description |
|---|---|
| `onSelect` | Receives an `EmojiSelection` (`emoji`, `unified`, `baseUnified`, `name`, `shortcode`, `shortcodes`, `skinTone`, `isCustom`, `imageUrl`) |
| `query`, `value`, `highlight`, `reactionsOpen`, `collapsedCategories` | Controllable as `x` / `defaultX` / `onXChange(value, details)`; see [Controlled state](#controlled-state) |
| `categories`, `frequent`, `suggested`, `emojiVersion` | Section order, names, icons (`nav: false` hides a tab), frequents, and filtering |
| `columns` | `"fit"` (default) fits the width; a number is exactly that many per row |
| `reactions` | Shows `Reactions`, a row that expands into the picker in `Panel`; see [Reactions](#reactions-and-emoji) |
| `searchResults`, `searchLimit` | `"ranked"` (one list) or `"grouped"` (sections in rank order) |
| `onKeyDown`, `actionsRef`, `keyboardTarget` | See [Keyboard](#keyboard) |
| `disableVariations` | Disables the long-press skin-tone menu |

Every part but `List` can be your own Base UI, React Aria, or shadcn/ui component on a hook:

| Part | Seam |
|---|---|
| `Search` | `useSearchState()` for the query and count; an input you render drives the grid as `keyboardTarget` |
| `SkinTone` | `useSkinTone()` returns `[tone, setTone]` |
| `CategoryNav` | `useCategoryNavigation()` returns `{ categories, activeCategory, jumpToCategory }` |
| `Reactions` | `useFrequentEmoji({ limit })` for the items, `useEmojiPickerActions()` to pick or expand |
| `EmojiPopover` | Any popover, with `pickerInitialFocus` as its initial focus |
| `List` | Owned here, since Base UI has no virtualization; bring a virtualizer with `useEmojiGrid` and `useEmojiCell` |

`List.SectionActions` renders controls over a sticky title, outside the listbox; its `toggle` and `toggleProps` collapse the section. `<List orientation="horizontal" rows={5} />` lays sections side by side; `searchRows` sets rows for results. `List renderEmptyState({ status, query, error, retry })` renders while data loads (`"loading"`), after it fails (`"error"`), and when nothing matches (`"empty"`).

## Provider

| Prop | Description |
|---|---|
| `data` | URL, `Dataset`, `EmojiDataInput`, or `({ signal }) => Promise<Dataset>`. Default: core's `data/en.json` from jsDelivr, pinned to the core version |
| `locale`, `labels` | Search folding and segmentation, A–Z order, result-count formatting, text direction, and `EmojiLabels` strings |
| `searchEngine` | An `EmojiSearch`; see [Search](#search) |
| `customEmojis` | A `CustomEmoji`, pack URL, loader, or an array of them; see [Custom emoji](https://emoji.brianhung.me/examples/custom-emoji/) |
| `filter` | `(record) => boolean`; removes emoji from pickers and search |
| `skinTone`, `defaultSkinTone`, `onSkinToneChange` | Shared skin tone |
| `frequents`, `defaultFrequents`, `onFrequentsChange` | Frequently used emoji as `Record<unified, { count, lastUsed }>`. Pickers and `useFrequentEmoji` skip entries the current data doesn't include, so history survives switching packs |
| `storage` | `{ frequents?, skinTone? }`: where uncontrolled frequents and skin tone persist. Default `localStorageAdapter(key)`, synced across tabs; `null` keeps one in memory |
| `frequentsTuning` | `{ halfLifeDays?, max? }`: how fast a use fades (default `14` days) and how many emoji the history keeps (default `64`) |
| `renderer`, `imageUrl`, `imageVersion` | `"auto"` (default) uses images only where the system cannot draw an emoji. `imageUrl(unified, { renderer })` returns an image URL or `undefined` for native text; the default returns Twemoji when `renderer` is `"image"` |

Changing a prop updates the provider in place; `storage` and `frequentsTuning` are read once. Pass functions and objects with stable identity. A dataset object without `customEmojis` renders on the first pass, including on the server.

## Controlled state

Every controllable state takes `x`, `defaultX` and `onXChange(value, details)`. `details` has `reason`, the `event` when there is one, `cancel()` and `isCanceled`, which keep the state as it is, and `allowPropagation()` and `isPropagationAllowed`. Changes made through `actionsRef` report `"imperative-action"`.

| State | Reasons |
|---|---|
| Root `query` | `"input-change"`, `"escape-key"`, `"imperative-action"`, `"none"` |
| Root `highlight` | `"keyboard"`, `"pointer"`, `"imperative-action"`, `"none"` |
| Root `value` | `"item-press"` |
| Root `collapsedCategories` | `"trigger-press"`, `"none"` |
| Root `reactionsOpen` | `"trigger-press"` (Expand), `"item-press"` (`details.collapse()` in `onSelect`), `"none"` |
| `SkinTone` `open` | `"trigger-press"`, `"outside-press"`, `"escape-key"`, `"item-press"`, `"imperative-action"`, `"none"` |
| `EmojiPopover.Root` `open`, `EmojiSuggestions.Popover` | `"trigger-press"`, `"outside-press"`, `"escape-key"`, `"item-press"`, `"focus-out"`, `"scroll"`, `"imperative-action"`, `"none"` |
| Provider `skinTone` | `"option-press"`, `"none"` |
| Provider `frequents` | `"pick"`, `"remove"`, `"clear"`, with `details.emoji` |

`allowPropagation()` lets an `"escape-key"` change of Root `query` or `SkinTone` `open` reach the page, such as a dialog around the picker. Other changes don't stop the event.

## Search

A search is `(query, { records, limit, signal, frequency, locale }) => { unified, score? }[] | Promise<…>`, best first. Compose engines from `@brianhung/emoji-picker-core/search`:

| Function | Description |
|---|---|
| `lexical({ typos, typoThreshold, locale, segmenter, tokenize })` | Default. Word index over shortcodes, names, and tags, with typo correction |
| `fallback(primary, secondary, { min })` | Uses `secondary` when `primary` returns fewer than `min` |
| `merge(...searches)` | Reciprocal rank fusion |
| `rerank(search, ...rerankers)`, `preferFrequent({ weight })` | Reorders results |
| `progressive(fast, slow)`, `withInterim(promise, hits)` | Shows fast results until slow ones arrive |
| `remote(fetcher)` | Any async source of hits |

`useEmojiSearch(query, { limit })` returns `{ results, pending }` from the provider, outside a picker. Embedding search: [Semantic search](https://emoji.brianhung.me/examples/semantic-search/).

## Popovers

`EmojiPopover` (from `/floating-ui` or `/react-aria`) positions, flips, and shifts its content, closes on Escape, outside press, or pick (`closeOnSelect={false}` keeps it open), and restores focus to the trigger or `finalFocus`. `anchor` accepts an element, virtual element, or rect function.

```tsx
import { EmojiPopover } from "@brianhung/emoji-picker-react/floating-ui";

<EmojiPopover.Root>
  <EmojiPopover.Trigger>🙂</EmojiPopover.Trigger>
  <EmojiPopover.Content side="top" align="end">
    <EmojiPicker.Root onSelect={insert}>…</EmojiPicker.Root>
  </EmojiPopover.Content>
</EmojiPopover.Root>
```

Content exposes `data-open`, `data-closed`, `data-starting-style`, `data-ending-style`, `data-side`, `data-align`, `--transform-origin`, `--available-width`, and `--available-height` for CSS transitions.

## Typeahead

`useTextFieldEmojiTypeahead(ref, options)` adds `:shortcode` suggestions to an `<input>` or `<textarea>`; `useEmojiTypeahead({ query, anchor, replace }, options, element)` does the same for any editor, with `findShortcodeTrigger(textBeforeCaret)` to find the query. Both return an `EmojiTypeahead` (`query`, `open`, `anchor`, `suggestions`, `dismiss`, `onKeyDown`) and make the field a combobox while it is open.

```tsx
const typeahead = useTextFieldEmojiTypeahead(ref, { onSelect: track });

<textarea ref={ref} />
<EmojiSuggestions.Popover open={typeahead.open} anchor={typeahead.anchor} onOpenChange={(open) => !open && typeahead.dismiss()}>
  <ul {...typeahead.suggestions.getListProps()}>
    {typeahead.suggestions.suggestions.map((s, i) => <li key={s.record.unified} {...typeahead.suggestions.getOptionProps(i)}>{s.record.emoji} :{s.shortcode}:</li>)}
  </ul>
</EmojiSuggestions.Popover>
```

Options: `matchBy` (`"shortcode"`, `"search"`), `order` (`"relevance"`, `"alphabetical"`), `columns`, `limit`, `insert` (`"emoji"`, `"shortcode"`), and `onSelect(selection)`, called once an emoji is inserted. `suggestions.choose(index?)` inserts a suggestion and counts it as used; `suggestions.insert(selection)` only writes a selection into the field, for a picker in the menu that already counted it:

```tsx
<EmojiPicker.Root query={typeahead.query} keyboardTarget={editor} onSelect={typeahead.suggestions.insert}>…</EmojiPicker.Root>
```

Tiptap, Lexical and ProseMirror adapters are registry items (`emoji-tiptap.json`, `emoji-lexical.json`, `emoji-prosemirror.json`): see the [Tiptap](https://emoji.brianhung.me/examples/tiptap/) and [Lexical](https://emoji.brianhung.me/examples/lexical/) examples.

## Reactions and emoji

```tsx
const { items } = useFrequentEmoji({ limit: 5 });

<EmojiPicker.Root reactions={items} onSelect={(selection, { collapse }) => (react(selection), collapse?.())}>
  <EmojiPicker.Reactions selected={mine} />
  <EmojiPicker.Panel>…</EmojiPicker.Panel>
</EmojiPicker.Root>
```

`Reactions` is the reaction row inside a picker, which expands into the full picker; `ReactionBar` is a standalone row of your own reaction buttons, outside any picker.

| Export | Description |
|---|---|
| `Reactions` | The row of `Root reactions`; `selected` makes the items toggle buttons, pressed in any skin tone. `Reactions.Expand` shows while a `Panel` is rendered |
| `ReactionBar` | React Aria's `Toolbar` for a row of your own buttons, with Home/End and hover carrying focus |
| `useFrequentEmoji({ limit })` | `{ items, record, remove, clear }` for the provider's frequently used emoji |
| `Emoji`, `useEmoji` | Renders or resolves a native emoji, shortcode, unified code, custom emoji id, `EmojiSelection`, `EmojiRecord`, or `CustomEmoji`; unknown input renders as text with `data-emoji-missing` |

## Keyboard

Parts handle their keys with React Aria: arrows, Page Up/Down, Home/End and Enter in the grid, Shift+Space for skin tones, `/` to search. Escape closes the skin-tone menu, then clears the query, then closes the popover. Keyboard and pointer move one highlight; with a search field focus stays in it (`aria-activedescendant`), otherwise it moves through the cells. Direction follows React Aria's locale, not CSS `direction`.

| Prop | Description |
|---|---|
| `onKeyDown` (Root, `Search`, `Search.Input`, `Viewport`, `List`, `CategoryNav`) | Runs before the picker's handler; `event.preventEmojiPickerHandler()` skips it |
| `actionsRef` | `move(to)`, `pick()`, `highlight(emoji)`, `focusSearch()`, `clearSearch()`, `close()`, `toggleSkinTone()`; `useEmojiPickerActions()` inside Root |
| `keyboardTarget` | An element that keeps focus, such as an editor; its arrows, Page Up/Down and Enter drive the picker, and Tab picks too while it is an expanded combobox (`aria-expanded="true"`) |

## Styling

Each part has a `data-slot` prefixed `emoji-picker-` (`emoji-picker-search-input`, `emoji-picker-list`, `emoji-picker-emoji`, …) and Base UI's state attributes: `data-highlighted` (the highlighted cell while focus stays in a search field or keyboard target), `data-selected`, `data-pressed`, `data-disabled`, `data-active` (the category tab in view, as on `Tabs.Tab`), `data-open` and `data-closed` on popups, `data-popup-open` on their triggers, and `data-starting-style` / `data-ending-style`. `data-hovered` (no hover on touch), `data-focus-visible`, and `data-focused` (real DOM focus, on the list, tabs and search field) come from React Aria. Emoji-specific: `data-unified`, `data-section`, `data-row`, `data-column`, `data-index`, `data-overridden`, `data-has-variations`, `data-collapsed`, `data-searching`, `data-empty`, `data-orientation`.

```css
[data-slot="emoji-picker-emoji"][data-highlighted] { background: var(--emoji-picker-selected); }
```

| Variable | Default |
|---|---|
| `--emoji-size`, `--emoji-image-size` | `30px` |
| `--emoji-cell-size` (grid pitch) | size + 10px |
| `--emoji-list-padding`, `--emoji-list-padding-end` | `10px` |
| `--emoji-header-height` | `40px` |
| `--emoji-cell-width`, `--emoji-cell-height`, `--emoji-section-gap`, `--emoji-section-min-width` | Horizontal list |
| `--emoji-font-family`, `--emoji-skin-tone-size` | System emoji fonts (from `tokens.css`), `15px` |

`List` sets `--emoji-picker-content-width` on `Root` to the grid's width.

## Accessibility

Each part follows its WAI-ARIA Authoring Practices pattern. Nothing animates by default.

| Part | Roles |
|---|---|
| Search | `searchbox` with `aria-activedescendant`; polite `status` for the result count |
| List | `listbox` › `group` per section › `option`; `aria-busy` during async search |
| CategoryNav, SkinTone | `tablist`; button with `aria-haspopup` opening a `radiogroup` |
| Variations | Shift+Space or long press opens a `listbox` of six tones |
| Reactions, ReactionBar | `toolbar`; toggle buttons with `aria-pressed` when `selected` is given |
| EmojiPopover | Non-modal `dialog`; trigger has `aria-haspopup="dialog"`, `aria-expanded` |
| Typeahead, `Emoji` | `combobox` and `listbox` props; `role="img"` (`decorative` hides it) |

## Advanced

**Self-hosted data.** Copy `node_modules/@brianhung/emoji-picker-core/data/en.json` to a path you serve and pass its URL: `<EmojiProvider data="/emoji/en.json">`. Other locales: `localeData("ja", { baseUrl: "/emoji" })` after copying `@brianhung/emoji-picker-data`'s `data/`, or build one with `npx @brianhung/emoji-picker-core build-data ja --out public/emoji/ja.json` (requires `emojibase-data`). Every locale keeps the iamcal shortcodes.

**Emoji fonts.** Native rendering draws text in `--emoji-font-family`, so any color emoji font works, including one you ship with your own emoji. Support detection and image fallback use that font. For example, Noto from Google Fonts:

```css
@import url("https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap");
[data-slot="emoji-picker"] { --emoji-font-family: "Noto Color Emoji"; }
```

Twemoji as a font: `import "@brianhung/emoji-picker-twemoji-font/twemoji.css"` and set `--emoji-font-family: Twemoji`.

**Own artwork.** Images instead of a font: `imageUrl` replaces particular emoji (or all of them) under any renderer:

```tsx
const imageUrl: ImageUrl = (unified, { renderer }) => ART[withoutTone(unified)] ?? (renderer === "image" ? twemojiUrl(unified) : undefined);
```

**Custom popover.** Put the picker in any popover (Base UI, Radix, shadcn/ui), close it from `onSelect`, and give `Search.Input` `autoFocus`. A picker without a search field takes `pickerInitialFocus(content)` (from either popover subpath) as the popover's initial focus. Escape clears the query before it reaches the popover.

**Custom virtualizer.** Call `useEmojiGrid({ rowHeight, headerHeight, columns, scrollToIndex })` inside `Root` in place of `List`, and `useEmojiCell(state, item)` per cell; keyboard, highlight, and variations are unchanged. See [Virtualizer](https://emoji.brianhung.me/examples/virtualizer/).

**Suggestions without an editor.** `useEmojiSuggestions({ query, onChoose })` is the suggestions state alone (`suggestions`, `highlightedIndex`, `choose`, `insert`, `onKeyDown`, prop getters), for a field the typeahead hooks don't cover.

**Typeahead adapters.** `useEmojiTypeaheadAdapter(create, deps)` renders a framework-neutral typeahead as an `EmojiTypeahead`: `create(store, { id })` returns `{ suggestions, anchor() }` built on core's `createEmojiSuggestions`, plus anything else to pass through (the Tiptap item returns its ProseMirror `plugin`).

**Search adapters.** Third-party engines: [core README](https://github.com/BrianHung/EmojiPicker/tree/main/packages/core#search-adapters).

## License

MIT. Third-party notices: [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
